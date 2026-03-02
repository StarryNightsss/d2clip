"""
企业社群 API：群组列表、按群组拉帖子、发帖、发报告、文件上传/下载（持久化）
"""
import mimetypes
from fastapi import APIRouter, HTTPException, Body, File, UploadFile
from fastapi.responses import FileResponse

from typing import Optional, List
from pydantic import BaseModel, Field

from backend.services.community_service import (
    load_groups,
    mark_group_read as mark_group_read_svc,
    list_users as list_users_svc,
    get_posts_by_group,
    create_post,
    like_post,
    share_post,
    add_comment_to_post,
    delete_comment as delete_comment_svc,
    delete_post as delete_post_svc,
    update_post as update_post_svc,
    forward_post_to_group,
    save_uploaded_file as save_upload_svc,
    get_uploaded_file_path,
    get_uploaded_file_name,
)
from backend.services.analysis_service import analysis_service

router = APIRouter(prefix="/community", tags=["community"])


class CreatePostBody(BaseModel):
    title: str = Field(..., description="标题")
    content: str = Field(..., description="正文")
    author: Optional[str] = Field("系统用户", description="发帖人")
    role: Optional[str] = Field("成员", description="角色")
    avatar: Optional[str] = None
    preview: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[dict]] = None


class CreateReportBody(BaseModel):
    analysis_id: Optional[str] = Field(None, description="分析 ID，不传则用最近一次")
    author: Optional[str] = Field("系统用户", description="发帖人")
    role: Optional[str] = Field("成员", description="角色")
    avatar: Optional[str] = None


@router.get("/users")
async def list_users():
    """获取员工/用户列表（含 username, name, avatar），用于发帖、评论时按作者展示头像。"""
    return list_users_svc()


@router.get("/groups")
async def list_groups(user_id: Optional[str] = None):
    """获取群组列表。若传 user_id，则每个群附带 has_unread（该用户在此群是否有未读新帖），用于红点角标。"""
    return load_groups(user_id=user_id)


class MarkReadBody(BaseModel):
    user_id: Optional[str] = Field("", description="当前用户标识，用于持久化已读状态")


@router.post("/groups/{group_key}/read")
async def mark_group_read(group_key: str, body: MarkReadBody = Body(default=None)):
    """标记某用户在某群已读（进入该群时调用），持久化后刷新/重进页面也不会再误报未读。"""
    user_id = (body and body.user_id) or ""
    groups = load_groups()
    keys = [g["key"] for g in groups]
    if group_key not in keys:
        raise HTTPException(status_code=404, detail="群组不存在")
    mark_group_read_svc(user_id, group_key)
    return {"ok": True}


@router.get("/groups/{group_key}/posts")
async def list_posts(group_key: str):
    """获取某群组的帖子列表，按时间倒序"""
    groups = load_groups()
    keys = [g["key"] for g in groups]
    if group_key not in keys:
        raise HTTPException(status_code=404, detail=f"群组不存在: {group_key}")
    return get_posts_by_group(group_key)


@router.post("/groups/{group_key}/posts")
async def add_post(group_key: str, body: CreatePostBody):
    """在群组下发帖（文本）"""
    groups = load_groups()
    keys = [g["key"] for g in groups]
    if group_key not in keys:
        raise HTTPException(status_code=404, detail=f"群组不存在: {group_key}")
    post = create_post(
        group_key,
        title=body.title,
        content=body.content,
        author=body.author or "系统用户",
        role=body.role or "成员",
        avatar=body.avatar,
        preview=body.preview,
        images=body.images,
        tags=body.tags,
        attachments=body.attachments,
        type="text",
    )
    return post


@router.post("/groups/{group_key}/posts/report")
async def add_report_post(group_key: str, body: CreateReportBody = Body(default=None)):
    """在群组下发布一条「报告」类型的帖子（关联分析结果，可查看/下载）"""
    if body is None:
        body = CreateReportBody()
    groups = load_groups()
    keys = [g["key"] for g in groups]
    if group_key not in keys:
        raise HTTPException(status_code=404, detail=f"群组不存在: {group_key}")

    analysis_id = body.analysis_id
    if not analysis_id:
        # 使用最近一次分析
        rid = getattr(analysis_service, "_latest_analysis_id", None)
        if not rid:
            raise HTTPException(
                status_code=400,
                detail="暂无分析报告，请先在分析工作台完成一次分析",
            )
        analysis_id = rid

    # 拉取报告摘要
    result = analysis_service.get_analysis_results(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="该分析报告不存在或已失效")
    total = result.get("total", 0)
    report_data = result.get("report") or {}
    report_title = (report_data.get("report_title") or "").strip() or "趋势分析报告"
    summary = (report_data.get("summary") or "").strip() or f"共分析 {total} 条笔记，点击查看详情。"
    # 正文用摘要即可，详情在前端点「查看」时跳报告页
    content = summary if len(summary) > 50 else f"本报告共分析 {total} 条笔记。\n\n{summary}"
    preview = summary[:120] + "..." if len(summary) > 120 else summary

    post = create_post(
        group_key,
        title=report_title,
        content=content,
        author=body.author or "系统用户",
        role=body.role or "成员",
        avatar=body.avatar,
        preview=preview,
        images=[],
        tags=["趋势报告", "分析"],
        attachments=[],
        type="report",
        analysis_id=analysis_id,
    )
    return post


class AddCommentBody(BaseModel):
    content: str = Field(..., description="评论内容")
    author: Optional[str] = Field("系统用户", description="评论人")
    role: Optional[str] = Field("成员", description="角色")
    avatar: Optional[str] = Field(None, description="评论人头像 URL")


class LikeBody(BaseModel):
    user_id: Optional[str] = Field("", description="当前用户标识，用于已赞状态与取消赞")


@router.post("/posts/{post_id}/like")
async def post_like(post_id: str, body: LikeBody = Body(default=None)):
    """点赞/取消赞：带 user_id 可切换已赞状态"""
    user_id = (body and body.user_id) or ""
    updated = like_post(post_id, user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return updated


@router.post("/posts/{post_id}/share")
async def post_share(post_id: str):
    """转发：帖子 shares +1"""
    updated = share_post(post_id)
    if not updated:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return updated


@router.post("/posts/{post_id}/comments")
async def post_add_comment(post_id: str, body: AddCommentBody):
    """添加评论"""
    updated = add_comment_to_post(
        post_id,
        author=body.author or "系统用户",
        content=body.content,
        role=body.role or "成员",
        avatar=body.avatar,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return updated


@router.delete("/posts/{post_id}/comments/{comment_index}")
async def post_delete_comment(post_id: str, comment_index: int):
    """删除指定下标的评论"""
    updated = delete_comment_svc(post_id, comment_index)
    if not updated:
        raise HTTPException(status_code=404, detail="帖子或评论不存在")
    return updated


class ForwardBody(BaseModel):
    target_group_key: str = Field(..., description="目标群组 key")
    author: Optional[str] = Field("系统用户", description="转发显示的发帖人")
    role: Optional[str] = Field("成员", description="角色")


@router.post("/posts/{post_id}/forward")
async def post_forward(post_id: str, body: ForwardBody):
    """转发到指定群组（在目标群复制一条）"""
    updated = forward_post_to_group(
        post_id,
        target_group_key=body.target_group_key,
        author=body.author or "系统用户",
        role=body.role or "成员",
    )
    if not updated:
        raise HTTPException(status_code=404, detail="帖子或目标群组不存在")
    return updated


class UpdatePostBody(BaseModel):
    title: Optional[str] = Field(None, description="标题")
    content: Optional[str] = Field(None, description="正文")
    preview: Optional[str] = Field(None, description="预览")


@router.put("/posts/{post_id}")
async def put_post(post_id: str, body: UpdatePostBody = Body(...)):
    """编辑帖子（标题、正文）"""
    updated = update_post_svc(
        post_id,
        title=body.title,
        content=body.content,
        preview=body.preview,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return updated


@router.delete("/posts/{post_id}")
async def delete_post_route(post_id: str):
    """删除帖子"""
    ok = delete_post_svc(post_id)
    if not ok:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return {"ok": True}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """上传一个文件，保存到服务端（持久化），返回 { file_id, name, size }，发帖时把该对象放入 attachments。"""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="文件为空")
    info = save_upload_svc(content, file.filename or "file")
    return info


@router.get("/files/{file_id}/download")
async def download_file(file_id: str):
    """按 file_id 下载已上传的文件，原格式、原文件名返回（持久化存储，刷新/关闭后仍在）。"""
    path = get_uploaded_file_path(file_id)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    name = get_uploaded_file_name(file_id) or path.name
    media_type, _ = mimetypes.guess_type(name)
    return FileResponse(
        path,
        media_type=media_type or "application/octet-stream",
        filename=name,
    )
