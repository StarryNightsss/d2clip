# 本地运行与隔离测试

## 一、运行前准备

1. **环境**：项目根目录下已安装依赖（前端 `npm install`，后端用 `uv`）。
2. **PostgreSQL**：本地已安装并启动，库名 `d2clip`。
3. **.env**（项目根目录，与 `backend` 同级）：
   ```env
   DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/d2clip
   ```

## 二、首次运行（建表 + 种子数据）

在**项目根目录**执行：

```bash
# 1. 建表并写入部门、用户、社群分组
uv run python scripts/seed_db.py

# 2. 若已有 analysis_tasks 表，补 user_id 列
uv run python scripts/migrate_analysis_user_id.py

# 3. 把 analysis_history.json 里的历史导入到 DB 并归为管理员（有旧 JSON 时执行）
uv run python scripts/import_analysis_history_to_db.py

# 4. 把表中已存在但 user_id 为空的记录归为管理员（可选）
uv run python scripts/backfill_analysis_admin.py

# 5. 把企业社群原有帖子导入到 DB（community_posts.json 或种子数据 → posts / post_comments）
uv run python scripts/import_community_posts_to_db.py
```

## 三、启动服务

**终端 1 - 后端**（项目根目录）：

```bash
uv run python backend/main.py
```

默认：http://localhost:8000，文档 http://localhost:8000/docs

**终端 2 - 前端**：

```bash
cd frontend
npm run dev
```

默认：http://localhost:5173

## 四、测试「按用户隔离」分析历史

1. **用管理员登录**  
   - 用户名：`admin@d2clip.com`，密码：`123456`  
   - 进入「分析工作台」或「趋势报告」，看「分析历史」：应能看到之前所有记录（含执行过 backfill 的旧数据）。

2. **用普通用户登录**  
   - 用户名：`zhangsan@d2clip.com`，密码：`123456`  
   - 进入同一页，看「分析历史」：应**只有该用户自己发起的分析**，看不到 admin 的，也看不到其他人的。

3. **交叉验证**  
   - 用 `zhangsan@d2clip.com` 跑一次分析，记下报告/历史条数。  
   - 退出，用 `lisi@d2clip.com` 登录，看分析历史：应**看不到** zhangsan 刚跑的那条。  
   - 再用 `zhangsan@d2clip.com` 登录，应仍能看到自己刚跑的那条。

4. **单条报告归属**  
   - 用 zhangsan 打开「自己的」某条报告详情，应正常。  
   - 若用 lisi 在地址栏改成 zhangsan 某条报告的 `analysis_id` 访问，应 404（后端按归属校验）。

## 五、企业社群说明

- **帖子可见范围**：进入某群组后，该群内**所有人发的帖子**都会显示（按部门/身份只能看到有权限的群，但群内帖子不按作者过滤，即能看到别人发的帖）。
- 首次用 DB 时执行 `import_community_posts_to_db.py` 可将原有 JSON 或种子帖子和评论导入到数据库，避免「清空」感。

## 六、默认/旧数据归属

- 执行过 `scripts/backfill_analysis_admin.py` 后：表中 `user_id` 为空的记录会更新为 `admin@d2clip.com`，仅管理员可见。  
- 未执行 backfill 时：代码仍把「未归属」记录视为仅管理员可访问（列表与单条都只对 admin 开放）。

