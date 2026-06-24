from __future__ import annotations

import shutil
import hashlib
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from hermes_cli import profiles as profiles_mod
from hermes_constants import get_hermes_home


router = APIRouter()


DEFAULT_TOOLSETS = ["web", "browser", "file", "image_gen", "cronjob", "skills", "memory"]
SKILL_DIRS: dict[str, tuple[str, ...]] = {
    "new-media-team": ("social-media", "new-media-team"),
    "powerpoint": ("productivity", "powerpoint"),
    "web-crawler-research": ("research", "web-crawler-research"),
}
AVAILABLE_COWORKER_SKILLS = tuple(SKILL_DIRS)
DEFAULT_SKILLS = AVAILABLE_COWORKER_SKILLS
_COWORKER_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


@dataclass(frozen=True)
class CoworkerPreset:
    id: str
    name: str
    role: str
    description: str
    strengths: tuple[str, ...]
    default_toolsets: tuple[str, ...]
    default_skills: tuple[str, ...]
    starter_prompts: tuple[str, ...]
    soul_focus: str
    source: str = "official"

    @property
    def profile_name(self) -> str:
        return f"nm-{self.id}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "description": self.description,
            "strengths": list(self.strengths),
            "profile_name": self.profile_name,
            "default_toolsets": list(self.default_toolsets),
            "default_skills": list(self.default_skills),
            "starter_prompts": list(self.starter_prompts),
            "soul_focus": self.soul_focus,
            "source": self.source,
        }


PRESETS: tuple[CoworkerPreset, ...] = (
    CoworkerPreset(
        id="social-media-manager",
        name="新媒体运营经理",
        role="内容日历与发布运营负责人",
        description="负责内容节奏、平台适配、发布检查清单和团队运营节奏。",
        strengths=("内容日历", "发布检查", "平台适配", "运营节奏"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "帮我规划本周主账号内容日历。",
            "把这份活动 brief 变成发布前检查清单。",
            "检查这篇稿子的平台适配和发布风险。",
        ),
        soul_focus="你负责新媒体团队的运营系统：内容日历、发布准备、平台适配和执行跟进。",
    ),
    CoworkerPreset(
        id="content-repurposer",
        name="内容改写复用师",
        role="长内容多平台拆解与改写专家",
        description="把长文、直播、访谈和资料拆成短视频、图文、推文、 newsletter 和素材包。",
        strengths=("长内容复用", "多平台改写", "素材提炼", "格式适配"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "把这篇文章改成短视频脚本、小红书笔记和 newsletter 摘要。",
            "从这段 transcript 里提炼可复用的钩子和切片。",
            "把这份草稿改成 3 个平台版本。",
        ),
        soul_focus="你擅长从一个素材源提炼最可复用的信息，并重塑成多个平台的发布版本。",
    ),
    CoworkerPreset(
        id="trend-researcher",
        name="热点选题研究员",
        role="热点、资料与选题角度研究员",
        description="发现趋势信号、验证资料来源，并把研究整理成可执行选题角度。",
        strengths=("热点发现", "资料收集", "角度筛选", "证据整理"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "从本周 AI/新媒体热点里找 10 个选题角度。",
            "研究这个话题，并按传播潜力排序选题角度。",
            "给下一条视频做一份带资料来源的选题 brief。",
        ),
        soul_focus="你是严谨的热点研究员，负责区分真实信号和噪音，并把资料转化为编辑机会。",
    ),
    CoworkerPreset(
        id="script-writer",
        name="短视频编导",
        role="短视频脚本、钩子和分镜编写",
        description="负责标题钩子、口播脚本、节奏拆分、字幕文案和拍摄分镜。",
        strengths=("标题钩子", "短视频脚本", "分镜脚本", "字幕文案"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "根据这个选题写一条 60 秒短视频脚本。",
            "给我 10 个标题钩子和逐镜头分镜。",
            "把这个脚本改得更紧凑、更有画面感。",
        ),
        soul_focus="你负责写出简洁、有画面感的脚本：强钩子、清晰节奏、拍摄提示和适合平台的行动引导。",
    ),
    CoworkerPreset(
        id="competitor-watcher",
        name="竞品观察员",
        role="竞品监控与内容情报分析师",
        description="跟踪竞品动作，整理周报，并提出差异化打法和风险提醒。",
        strengths=("竞品监控", "周报复盘", "差异化建议", "风险提醒"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "根据这些账号做一份竞品观察报告。",
            "总结竞品本周动作，并提出我们下周可测试的方向。",
            "从这些竞品内容里找差异化机会。",
        ),
        soul_focus="你负责监控竞品行为，并把观察转化为具体实验、风险提醒和差异化建议。",
    ),
    CoworkerPreset(
        id="growth-analyst",
        name="增长数据分析师",
        role="内容增长、指标复盘和实验设计负责人",
        description="把播放、点击、转化和粉丝数据整理成可执行的增长实验。负责复盘、归因假设和下轮测试计划。",
        strengths=("数据复盘", "增长实验", "指标诊断", "A/B 测试"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "根据这份数据做一份本周内容增长复盘。",
            "帮我设计 5 个下周可测试的标题/封面/发布时间实验。",
            "把这些账号数据整理成问题诊断和改进动作。",
        ),
        soul_focus="你负责把内容数据变成增长判断：发现异常、提出假设、设计低成本实验，并明确下一步指标。",
    ),
    CoworkerPreset(
        id="brand-editor",
        name="品牌主编",
        role="品牌表达、栏目结构和内容质量把关",
        description="统一品牌语气、栏目定位和内容结构，负责让输出更稳定、更像一个专业媒体账号。",
        strengths=("品牌语气", "栏目规划", "结构编辑", "质量把关"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "帮我把这篇稿子改成更符合品牌语气的版本。",
            "设计 4 个适合我们账号长期运营的栏目。",
            "检查这份内容是否跑偏，并给出编辑修改建议。",
        ),
        soul_focus="你负责守住品牌表达和内容质量：语气一致、结构清晰、观点有辨识度，避免低质泛化内容。",
    ),
    CoworkerPreset(
        id="visual-director",
        name="视觉创意总监",
        role="封面、海报、分镜和视觉资产策划",
        description="把选题转成封面方向、视觉风格、素材清单、海报文案和分镜资产需求。",
        strengths=("封面方向", "视觉风格", "海报文案", "素材清单"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "给这个选题做 6 个封面方案和画面提示词。",
            "把这条视频脚本拆成视觉素材清单。",
            "为这次活动设计小红书/公众号/B站三套视觉方向。",
        ),
        soul_focus="你负责让内容有可执行的视觉方案：构图、风格、素材、封面、分镜和设计交付说明要清楚。",
    ),
    CoworkerPreset(
        id="ppt-producer",
        name="提案 PPT 制作人",
        role="方案型 PPT、复盘汇报和商业提案制作",
        description="把调研、复盘、活动方案和内容策略整理成可讲述的 PPT 结构和页面文案。",
        strengths=("PPT 大纲", "页面文案", "汇报结构", "提案叙事"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "把这份内容策略整理成 12 页提案 PPT 大纲。",
            "根据这些资料生成一份复盘汇报 PPT 的页面结构。",
            "帮我把这份 brief 做成客户提案的讲述逻辑。",
        ),
        soul_focus="你负责把资料变成可以汇报的 PPT：先讲清叙事结构，再给页面标题、要点、图表建议和交付文件计划。",
    ),
    CoworkerPreset(
        id="crawler-researcher",
        name="网页采集研究员",
        role="网页资料采集、来源整理和结构化摘录",
        description="围绕选题或竞品链接做网页采集、摘要、去重、来源记录和资料包整理。",
        strengths=("网页采集", "来源整理", "资料去重", "结构化摘录"),
        default_toolsets=tuple(DEFAULT_TOOLSETS),
        default_skills=DEFAULT_SKILLS,
        starter_prompts=(
            "围绕这个主题采集 10 个可靠网页来源并做摘要。",
            "把这些竞品链接整理成结构化资料表。",
            "帮我抓取公开网页资料，输出选题证据包。",
        ),
        soul_focus="你负责网页采集和资料整理：记录来源、摘要要点、去重归类，并提醒不可访问或可信度不足的来源。",
    ),
)


def _custom_registry_path() -> Path:
    return get_hermes_home() / "new_media_coworkers" / "custom_presets.yaml"


def _coerce_str_list(value: Any, fallback: list[str] | tuple[str, ...] = ()) -> tuple[str, ...]:
    if value is None:
        return tuple(fallback)
    if isinstance(value, str):
        items = [part.strip() for part in value.split("\n")]
    elif isinstance(value, list | tuple):
        items = [str(part).strip() for part in value]
    else:
        items = []
    return tuple(item for item in items if item)


def _custom_id_for_name(name: str) -> str:
    digest = hashlib.sha1(name.strip().encode("utf-8")).hexdigest()[:10]
    return f"custom-{digest}"


def _load_custom_presets() -> list[CoworkerPreset]:
    path = _custom_registry_path()
    if not path.exists():
        return []
    loaded = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    rows = loaded.get("coworkers", []) if isinstance(loaded, dict) else []
    presets: list[CoworkerPreset] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        preset_id = str(row.get("id", "")).strip()
        name = str(row.get("name", "")).strip()
        if not preset_id or not name or not _COWORKER_ID_RE.match(preset_id):
            continue
        presets.append(CoworkerPreset(
            id=preset_id,
            name=name,
            role=str(row.get("role", "")).strip(),
            description=str(row.get("description", "")).strip(),
            strengths=_coerce_str_list(row.get("strengths")),
            default_toolsets=_coerce_str_list(row.get("default_toolsets"), DEFAULT_TOOLSETS),
            default_skills=_coerce_str_list(row.get("default_skills"), DEFAULT_SKILLS),
            starter_prompts=_coerce_str_list(row.get("starter_prompts")),
            soul_focus=str(row.get("soul_focus", "")).strip(),
            source="custom",
        ))
    return presets


def _write_custom_presets(presets: list[CoworkerPreset]) -> None:
    path = _custom_registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for preset in presets:
        data = preset.to_dict()
        data.pop("profile_name", None)
        data.pop("source", None)
        rows.append(data)
    path.write_text(
        yaml.safe_dump({"coworkers": rows}, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )


def _all_presets() -> list[CoworkerPreset]:
    by_id = {preset.id: preset for preset in PRESETS}
    for preset in _load_custom_presets():
        by_id[preset.id] = preset
    return list(by_id.values())


def _preset_by_id(preset_id: str) -> CoworkerPreset:
    for preset in _all_presets():
        if preset.id == preset_id:
            return preset
    raise ValueError(f"Unknown coworker preset: {preset_id}")


def list_presets() -> list[dict[str, Any]]:
    return [preset.to_dict() for preset in _all_presets()]


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _source_skill_dir() -> Path:
    return _repo_root() / "skills" / "social-media" / "new-media-team"


def _copy_skill(profile_dir: Path, skill_name: str) -> None:
    rel = SKILL_DIRS.get(skill_name)
    if not rel:
        return
    src = _repo_root() / "skills" / Path(*rel)
    if not src.is_dir():
        raise FileNotFoundError(f"Skill '{skill_name}' not found at {src}")
    dst = profile_dir / "skills" / Path(*rel)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst, dirs_exist_ok=True)


def _copy_available_coworker_skills(profile_dir: Path) -> None:
    for skill_name in AVAILABLE_COWORKER_SKILLS:
        _copy_skill(profile_dir, skill_name)


def _build_soul(preset: CoworkerPreset) -> str:
    strengths = "\n".join(f"- {item}" for item in preset.strengths)
    prompts = "\n".join(f"- {item}" for item in preset.starter_prompts)
    return f"""# {preset.name}

你是「{preset.name}」，服务于新媒体团队的 AI 同事。

## 岗位定位
{preset.role}

## 核心使命
{preset.soul_focus}

## 擅长工作
{strengths}

## 工作规则
- 当目标、受众、平台、截止时间、素材来源不明确时，先提出必要问题。
- 输出必须能进入生产流程：负责人、渠道、素材、下一步动作、审核状态要清楚。
- 明确区分事实、假设和创意建议。
- 不要编造数据、竞品信息、平台规则或需要来源支撑的结论。
- 如果需要实时信息，优先使用可用工具检索；无法确认时标注为“待验证草案”。
- 优先输出表格、清单、脚本、分镜和交接说明，少给泛泛建议。

## 可直接开始的任务
{prompts}
"""


def _merge_config(profile_dir: Path, preset: CoworkerPreset) -> None:
    config_path = profile_dir / "config.yaml"
    config: dict[str, Any] = {}
    if config_path.exists():
        loaded = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
        if isinstance(loaded, dict):
            config = loaded

    tools = config.setdefault("tools", {})
    if not isinstance(tools, dict):
        tools = {}
        config["tools"] = tools
    platforms = tools.setdefault("platforms", {})
    if not isinstance(platforms, dict):
        platforms = {}
        tools["platforms"] = platforms
    platforms["cli"] = list(preset.default_toolsets)

    skills = config.setdefault("skills", {})
    if not isinstance(skills, dict):
        skills = {}
        config["skills"] = skills
    skills["coworker_defaults"] = list(preset.default_skills)

    config_path.write_text(
        yaml.safe_dump(config, sort_keys=False, allow_unicode=False),
        encoding="utf-8",
    )


def create_coworker_profile(preset_id: str) -> dict[str, Any]:
    preset = _preset_by_id(preset_id)
    profile_name = preset.profile_name
    profile_dir = profiles_mod.get_profile_dir(profile_name)
    created = False

    if not profile_dir.exists():
        profile_dir = profiles_mod.create_profile(
            profile_name,
            clone_config=True,
            no_alias=True,
        )
        created = True

    _copy_available_coworker_skills(profile_dir)
    (profile_dir / "SOUL.md").write_text(_build_soul(preset), encoding="utf-8")
    _merge_config(profile_dir, preset)

    return {
        "ok": True,
        "created": created,
        "preset": preset.to_dict(),
        "profile_name": profile_name,
        "path": str(profile_dir),
        "launch_command": f"hermes --profile {profile_name} chat",
        "chat_url": f"/webchat?profile={profile_name}",
    }


def upsert_custom_coworker(payload: dict[str, Any]) -> dict[str, Any]:
    name = str(payload.get("name", "")).strip()
    if not name:
        raise ValueError("Coworker name is required")

    preset_id = str(payload.get("id") or "").strip()
    if not preset_id:
        preset_id = _custom_id_for_name(name)
    if not _COWORKER_ID_RE.match(preset_id):
        raise ValueError("Coworker id must be lowercase letters, numbers, dashes, or underscores")
    preset = CoworkerPreset(
        id=preset_id,
        name=name,
        role=str(payload.get("role", "")).strip(),
        description=str(payload.get("description", "")).strip(),
        strengths=_coerce_str_list(payload.get("strengths")),
        default_toolsets=_coerce_str_list(payload.get("default_toolsets"), DEFAULT_TOOLSETS),
        default_skills=_coerce_str_list(payload.get("default_skills"), DEFAULT_SKILLS),
        starter_prompts=_coerce_str_list(payload.get("starter_prompts")),
        soul_focus=str(payload.get("soul_focus", "")).strip(),
        source="custom",
    )

    custom = [row for row in _load_custom_presets() if row.id != preset_id]
    custom.append(preset)
    custom.sort(key=lambda row: row.name)
    _write_custom_presets(custom)

    return create_coworker_profile(preset_id)


def coworker_status() -> dict[str, Any]:
    rows = []
    for preset in _all_presets():
        profile_dir = profiles_mod.get_profile_dir(preset.profile_name)
        rows.append({
            **preset.to_dict(),
            "created": profile_dir.is_dir(),
            "path": str(profile_dir) if profile_dir.exists() else "",
            "launch_command": f"hermes --profile {preset.profile_name} chat",
            "chat_url": f"/webchat?profile={preset.profile_name}",
        })
    return {"coworkers": rows}


class CreateCoworkerBody(BaseModel):
    preset_id: str


class UpsertCoworkerBody(BaseModel):
    id: str | None = None
    name: str
    role: str = ""
    description: str = ""
    strengths: list[str] = []
    default_toolsets: list[str] = DEFAULT_TOOLSETS
    default_skills: list[str] = list(DEFAULT_SKILLS)
    starter_prompts: list[str] = []
    soul_focus: str = ""


@router.get("/presets")
async def presets_endpoint():
    return {"presets": list_presets()}


@router.get("/status")
async def status_endpoint():
    return coworker_status()


@router.post("/create")
async def create_endpoint(body: CreateCoworkerBody):
    try:
        return create_coworker_profile(body.preset_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/custom")
async def upsert_custom_endpoint(body: UpsertCoworkerBody):
    try:
        return upsert_custom_coworker(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
