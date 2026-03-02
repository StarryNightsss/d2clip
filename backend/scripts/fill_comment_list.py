"""
一次性脚本：根据每个帖子的 comments 字段，将 comment_list 补全或截断到相同条数。
评论内容结合帖子主题，头像使用 dicebear 7.x。
"""
import json
import sys
from pathlib import Path

# 项目根目录
ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "backend" / "data" / "community_posts.json"

BASE_TIME = "2026-03-01T08:29:33.586137Z"
AVATAR_BASE = "https://api.dicebear.com/7.x/avataaars/svg?seed="


def _c(author: str, content: str, role: str, seed: str) -> dict:
    return {
        "author": author,
        "content": content,
        "role": role,
        "created_at": BASE_TIME,
        "avatar": AVATAR_BASE + seed,
    }


# 帖子 id -> 需要追加的评论（在现有 3 条基础上追加，直到总数 = post["comments"]）
EXTRA_COMMENTS = {
    "2": [  # 口红色号需求统计，共 8 条，已有 3，补 5
        _c("吴倩", "番茄色占比10%可以考虑做限定款。", "产品部门", "wuqian"),
        _c("郑浩", "裸色系25%和上周持平，趋势稳定。", "设计部门", "zhenghao"),
        _c("林娜", "正红12%那部分我们下次直播可以带。", "市场部门", "linna"),
        _c("黄磊", "数据已收，明天同步给设计。", "运营部门", "huanglei"),
        _c("何静", "研发会按这个比例排产。", "产品部门", "hejing"),
    ],
    "3": [  # 桃夭色卡方案，共 18 条，已有 3，补 15
        _c("孙婷", "16款方案都看了，桃夭和灼华可以先打样。", "产品部门", "sunting"),
        _c("赵琳", "色卡.sketch 已更新到共享盘。", "设计部门", "zhaolin"),
        _c("周敏", "多层叠加测试数据能发我们一份吗？", "市场部门", "zhoumin"),
        _c("吴倩", "诗经这句可以做主 slogan。", "运营部门", "wuqian"),
        _c("郑浩", "裸色系方案和趋势报告对上了。", "产品经理", "zhenghao"),
        _c("林娜", "芳菲的奶茶裸很适合秋冬。", "设计部门", "linna"),
        _c("黄磊", "试妆验证我们周三前完成。", "市场部门", "huanglei"),
        _c("何静", "建议市场尽快安排+1。", "运营部门", "hejing"),
        _c("李明", "色彩稳定性数据已记入报告。", "产品部门", "liming"),
        _c("王芳", "E8B4A0 和 D4A59A 对比度已校过。", "色彩设计师", "wangfang"),
        _c("陈悦", "豆沙橘调我们重点推。", "市场部门", "chenyue"),
        _c("刘洋", "宣发会用桃之夭夭灼灼其华。", "运营部门", "liuyang"),
        _c("张晓雯", "打样给试妆组这周能排吗？", "产品经理", "zhang"),
        _c("孙婷", "低饱和度雾面质地和地母系报告一致。", "产品部门", "sunting2"),
        _c("赵琳", "16款里优先3款主色没问题。", "设计部门", "zhaolin2"),
    ],
    "4": [  # 试妆效果多肤色，共 14 条，已有 3，补 11
        _c("陈悦", "黄一白显白度++ 那组图可以做主图。", "市场专员", "chenyue"),
        _c("张晓雯", "20-35岁人群我们主推渠道对。", "产品经理", "zhang"),
        _c("王芳", "黄黑皮+5%饱和度修订版色卡已出。", "设计部门", "wangfang"),
        _c("孙婷", "粉二白自然感强，用户反馈会好。", "产品部门", "sunting"),
        _c("赵琳", "宣发素材我们按三种肤色各做一版。", "设计部门", "zhaolin"),
        _c("周敏", "办公室白领日常妆容定位准确。", "市场部门", "zhoumin"),
        _c("吴倩", "已收到，首图用黄一白。", "运营部门", "wuqian"),
        _c("郑浩", "亚洲肤色女性数据和我们画像一致。", "产品部门", "zhenghao"),
        _c("林娜", "试妆验证已同步运营。", "市场部门", "linna"),
        _c("黄磊", "素材准备中，周三前给。", "运营部门", "huanglei"),
        _c("何静", "饱和度+5% 的修订已记入色卡。", "产品部门", "hejing"),
    ],
    "5": [  # 推广文案小红书，共 9 条，已有 3，补 6
        _c("刘洋", "10w+ 曝光我们按5%互动率拆了任务。", "内容运营", "liuyang"),
        _c("李明", "方案B和C的文案也发我看下。", "产品部门", "liming"),
        _c("王芳", "首图已导出，桃夭主色那张。", "设计部门", "wangfang"),
        _c("陈悦", "试妆图确认了，可以用于推广。", "市场部门", "chenyue"),
        _c("孙婷", "周三 10:00 三个平台一起发没问题。", "产品部门", "sunting"),
        _c("赵琳", "黄皮亲妈色号这句可以加进主文案。", "设计部门", "zhaolin"),
    ],
}


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        posts = json.load(f)

    for p in posts:
        want = int(p.get("comments") or 0)
        if want == 0:
            p["comment_list"] = []
            continue
        current = list(p.get("comment_list") or [])
        pid = p.get("id", "")
        extra = EXTRA_COMMENTS.get(pid, [])

        if len(current) < want:
            need = want - len(current)
            for i in range(need):
                if i < len(extra):
                    current.append(extra[i])
                else:
                    # 兜底：用通用评论
                    current.append(
                        _c(
                            "同事",
                            "收到，已同步。",
                            "成员",
                            f"{pid}_extra_{i}",
                        )
                    )
        else:
            current = current[:want]

        p["comment_list"] = current
        p["comments"] = len(current)

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print("Done. comment_list 已按各帖 comments 数量补全。", file=sys.stderr)


if __name__ == "__main__":
    main()
