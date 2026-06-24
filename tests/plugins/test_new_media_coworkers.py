from pathlib import Path

import pytest


@pytest.fixture()
def profile_root(tmp_path, monkeypatch):
    root = tmp_path / ".hermes"
    root.mkdir()
    monkeypatch.setenv("HERMES_HOME", str(root))
    return root


def test_presets_include_new_media_coworkers():
    from plugins.new_media_coworkers.dashboard import plugin_api

    presets = plugin_api.list_presets()
    ids = {preset["id"] for preset in presets}

    assert ids == {
        "brand-editor",
        "social-media-manager",
        "content-repurposer",
        "crawler-researcher",
        "trend-researcher",
        "growth-analyst",
        "ppt-producer",
        "script-writer",
        "competitor-watcher",
        "visual-director",
    }
    for preset in presets:
        assert preset["profile_name"].startswith("nm-")
        assert "new-media-team" in preset["default_skills"]
        assert "web-crawler-research" in preset["default_skills"]
        assert "web" in preset["default_toolsets"]
    names = {preset["id"]: preset["name"] for preset in presets}
    assert names["social-media-manager"] == "新媒体运营经理"
    assert names["script-writer"] == "短视频编导"
    assert names["ppt-producer"] == "提案 PPT 制作人"


def test_create_coworker_profile_writes_soul_config_and_skill(profile_root):
    from plugins.new_media_coworkers.dashboard import plugin_api

    result = plugin_api.create_coworker_profile("script-writer")

    assert result["ok"] is True
    assert result["created"] is True
    assert result["profile_name"] == "nm-script-writer"

    profile_dir = Path(result["path"])
    soul = (profile_dir / "SOUL.md").read_text(encoding="utf-8")
    config = (profile_dir / "config.yaml").read_text(encoding="utf-8")
    skill = profile_dir / "skills" / "social-media" / "new-media-team" / "SKILL.md"

    assert "短视频编导" in soul
    assert "不要编造数据" in soul
    assert "new-media-team" in config
    assert "web-crawler-research" in config
    assert "image_gen" in config
    assert skill.exists()


def test_create_coworker_profile_is_idempotent(profile_root):
    from plugins.new_media_coworkers.dashboard import plugin_api

    first = plugin_api.create_coworker_profile("competitor-watcher")
    second = plugin_api.create_coworker_profile("competitor-watcher")

    assert first["created"] is True
    assert second["created"] is False
    assert second["profile_name"] == "nm-competitor-watcher"


def test_upsert_custom_coworker_persists_and_creates_profile(profile_root):
    from plugins.new_media_coworkers.dashboard import plugin_api

    result = plugin_api.upsert_custom_coworker({
        "name": "公众号主编",
        "role": "公众号选题、结构和终稿负责人",
        "description": "负责公众号文章选题、结构、标题和发布前审稿。",
        "strengths": ["选题判断", "文章结构", "标题优化"],
        "default_toolsets": ["web", "file", "skills"],
        "default_skills": ["new-media-team"],
        "starter_prompts": ["帮我把这个选题扩成公众号大纲。"],
        "soul_focus": "你负责把素材打磨成适合公众号发布的深度内容。",
    })

    assert result["ok"] is True
    assert result["preset"]["source"] == "custom"
    assert result["preset"]["name"] == "公众号主编"
    assert result["profile_name"].startswith("nm-custom-")

    registry = profile_root / "new_media_coworkers" / "custom_presets.yaml"
    assert registry.exists()
    assert "公众号主编" in registry.read_text(encoding="utf-8")

    profile_dir = Path(result["path"])
    soul = (profile_dir / "SOUL.md").read_text(encoding="utf-8")
    assert "公众号主编" in soul
    assert "不要编造数据" in soul

    presets = {preset["id"]: preset for preset in plugin_api.list_presets()}
    assert result["preset"]["id"] in presets
    assert presets[result["preset"]["id"]]["source"] == "custom"


def test_upsert_custom_coworker_updates_existing_profile(profile_root):
    from plugins.new_media_coworkers.dashboard import plugin_api

    first = plugin_api.upsert_custom_coworker({
        "name": "公众号主编",
        "role": "公众号负责人",
        "description": "负责公众号内容。",
        "strengths": ["选题"],
        "starter_prompts": ["写一版大纲。"],
        "soul_focus": "你负责公众号内容。",
    })
    second = plugin_api.upsert_custom_coworker({
        "id": first["preset"]["id"],
        "name": "公众号主编 Pro",
        "role": "公众号深度内容负责人",
        "description": "负责公众号深度文章。",
        "strengths": ["深度结构", "标题"],
        "starter_prompts": ["写一版深度文章大纲。"],
        "soul_focus": "你负责更深度的公众号内容。",
    })

    assert second["created"] is False
    assert second["profile_name"] == first["profile_name"]
    soul = (Path(second["path"]) / "SOUL.md").read_text(encoding="utf-8")
    assert "公众号主编 Pro" in soul
    assert "更深度的公众号内容" in soul


def test_upsert_can_override_official_coworker(profile_root):
    from plugins.new_media_coworkers.dashboard import plugin_api

    result = plugin_api.upsert_custom_coworker({
        "id": "script-writer",
        "name": "爆款短视频编导",
        "role": "短视频爆款脚本负责人",
        "description": "负责强钩子短视频脚本。",
        "strengths": ["爆款钩子"],
        "starter_prompts": ["写 5 个爆款开头。"],
        "soul_focus": "你负责更强传播力的短视频脚本。",
    })

    assert result["profile_name"] == "nm-script-writer"
    presets = {preset["id"]: preset for preset in plugin_api.list_presets()}
    assert presets["script-writer"]["name"] == "爆款短视频编导"
    assert presets["script-writer"]["source"] == "custom"


def test_unknown_preset_is_rejected(profile_root):
    from plugins.new_media_coworkers.dashboard import plugin_api

    with pytest.raises(ValueError, match="Unknown coworker preset"):
        plugin_api.create_coworker_profile("nope")
