# Git Commit Guidelines

## 提交规范 (Commit Guidelines)

### 强制执行规则 (Mandatory Rules)
1. **每次完成功能开发后必须提交代码**
2. **每次完成测试工作后必须提交代码**
3. **提交前必须运行相关测试确保通过**
4. **提交消息必须清晰描述更改内容**

### 提交消息格式 (Commit Message Format)

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type (类型)
- **feat**: 新功能 (new feature)
- **fix**: 修复bug (bug fix)
- **docs**: 文档更改 (documentation)
- **style**: 格式更改，不影响代码逻辑 (formatting, no code change)
- **refactor**: 重构代码 (refactoring code)
- **test**: 添加或修改测试 (adding or modifying tests)
- **chore**: 构建过程或辅助工具的变动 (build process or auxiliary tools)
- **perf**: 性能优化 (performance improvement)

#### Scope (范围)
- **backend**: 后端相关更改
- **frontend**: 前端相关更改
- **docker**: Docker配置更改
- **docs**: 文档更改
- **config**: 配置文件更改
- **test**: 测试相关更改

#### Subject (主题)
- 使用祈使句，首字母小写
- 不超过50个字符
- 不使用句号结尾

#### Body (正文)
- 详细说明更改的动机和影响
- 可以包含多个段落
- 每行不超过72个字符

#### Footer (页脚)
- 包含 Breaking Changes
- 关联的 Issue 编号
- Co-authored-by 信息

### 提交流程 (Commit Workflow)

```bash
# 1. 检查状态
git status

# 2. 查看更改
git diff

# 3. 运行测试
docker-compose exec backend pytest
docker-compose exec frontend npm test

# 4. 添加更改
git add .

# 5. 提交更改
git commit -m "type(scope): subject

详细描述...

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 6. 推送到远程
git push origin <branch-name>
```

### 自动化提交脚本 (Automated Commit Script)

创建 `commit.sh` 脚本自动执行提交流程：

```bash
#!/bin/bash
# commit.sh - 自动化提交脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印彩色消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 1. 检查是否有更改
if [ -z "$(git status --porcelain)" ]; then
    print_message "No changes to commit" $YELLOW
    exit 0
fi

# 2. 运行测试
print_message "Running tests..." $YELLOW
docker-compose exec backend pytest
if [ $? -ne 0 ]; then
    print_message "Backend tests failed!" $RED
    exit 1
fi

docker-compose exec frontend npm test
if [ $? -ne 0 ]; then
    print_message "Frontend tests failed!" $RED
    exit 1
fi

# 3. 获取提交信息
echo "Enter commit type (feat/fix/docs/style/refactor/test/chore/perf):"
read TYPE

echo "Enter commit scope (backend/frontend/docker/docs/config/test):"
read SCOPE

echo "Enter commit subject (short description):"
read SUBJECT

echo "Enter commit body (detailed description, press Ctrl+D when done):"
BODY=$(cat)

# 4. 执行提交
git add .
git commit -m "$TYPE($SCOPE): $SUBJECT

$BODY

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 5. 推送到远程
print_message "Pushing to remote..." $GREEN
git push origin $(git branch --show-current)

print_message "Commit completed successfully!" $GREEN
```

### 提交示例 (Commit Examples)

#### 功能开发
```
feat(backend): add PDF processing service

- Implemented PDF text extraction using PyPDF2
- Added support for multi-page documents
- Integrated with document processor service
- Added unit tests for PDF processing

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### Bug修复
```
fix(frontend): resolve routing issue in CourseGeneration

- Fixed navigation error when uploading documents
- Updated route configuration in App.tsx
- Added error boundary for better error handling

Fixes #123

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### 性能优化
```
perf(backend): optimize database queries in course service

- Implemented query batching for course retrieval
- Added database connection pooling
- Reduced query time by 60%
- Added performance benchmarks

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 提交检查清单 (Commit Checklist)

在每次提交前，确保：

- [ ] 代码已通过所有测试
- [ ] 代码符合项目编码规范
- [ ] 文档已更新（如果需要）
- [ ] 提交消息清晰且符合规范
- [ ] 没有包含敏感信息（如密码、API密钥）
- [ ] 已解决所有代码审查意见

### 回滚操作 (Rollback Operations)

如果需要撤销提交：

```bash
# 撤销最后一次提交（保留更改）
git reset --soft HEAD~1

# 撤销最后一次提交（丢弃更改）
git reset --hard HEAD~1

# 撤销推送到远程的提交
git revert <commit-hash>
git push origin <branch-name>
```

### 最佳实践 (Best Practices)

1. **频繁提交**：小而频繁的提交比大而稀少的提交更好
2. **原子提交**：每个提交应该只包含一个逻辑更改
3. **测试先行**：在提交前始终运行测试
4. **及时同步**：定期从主分支拉取最新更改
5. **代码审查**：重要更改应经过代码审查

### 自动化钩子 (Git Hooks)

创建 `.git/hooks/pre-commit` 文件自动运行测试：

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit tests..."

# Run backend tests
docker-compose exec backend pytest
if [ $? -ne 0 ]; then
    echo "Backend tests failed. Commit aborted."
    exit 1
fi

# Run frontend tests
docker-compose exec frontend npm test
if [ $? -ne 0 ]; then
    echo "Frontend tests failed. Commit aborted."
    exit 1
fi

echo "All tests passed. Proceeding with commit."
exit 0
```

### 记录与追踪 (Tracking)

每次提交后，更新 `docs/development/commit-log.md` 文件记录：
- 提交时间
- 提交类型
- 功能描述
- 测试状态
- 相关Issue

---

**重要提醒**：严格遵守这些提交规范是项目质量保证的关键部分。每次代码更改都必须经过测试验证并及时提交。