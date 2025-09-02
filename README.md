# 智能课程内容生成系统 (Curriculum Knowledge Planning)

基于大模型的智能课程内容生成系统，可自动处理多格式文档并生成结构化课程内容。

## 🌟 系统特点

- 📄 **多格式文档支持**: PDF、Word、Excel、文本、Markdown
- 🤖 **AI驱动生成**: 基于大模型技术自动生成高质量课程内容
- 🎯 **SMART原则**: 遵循教育学原理制定学习目标
- 🗺️ **知识图谱**: 可视化展示知识点关系和学习路径
- 💎 **精美界面**: 现代化UI设计，操作便捷
- ⚡ **实时预览**: 内容生成过程实时展示

## 🛠️ 技术栈

### 后端
- **框架**: FastAPI (Python 3.11+)
- **文档处理**: PyPDF2, python-docx, pandas
- **AI集成**: LangChain, OpenAI API
- **数据库**: PostgreSQL, Redis, Neo4j
- **向量存储**: Weaviate

### 前端
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design Pro
- **可视化**: D3.js, G6
- **样式**: TailwindCSS
- **状态管理**: Zustand

## 🚀 快速开始

### 环境要求
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Neo4j 5+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/CurriculumKnowledgePlanning.git
cd CurriculumKnowledgePlanning
```

2. **后端安装**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **前端安装**
```bash
cd frontend
npm install
```

4. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接和API密钥
```

5. **启动服务**

后端:
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

前端:
```bash
cd frontend
npm run dev
```

## 📁 项目结构

```
CurriculumKnowledgePlanning/
├── backend/              # 后端服务
│   ├── app/
│   │   ├── api/         # API路由
│   │   ├── core/        # 核心配置
│   │   ├── models/      # 数据模型
│   │   ├── services/    # 业务逻辑
│   │   └── utils/       # 工具函数
│   └── tests/           # 测试用例
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── components/  # 组件库
│   │   ├── pages/       # 页面
│   │   ├── services/    # API服务
│   │   └── utils/       # 工具函数
│   └── public/          # 静态资源
├── docker/              # Docker配置
└── docs/                # 文档

```

## 🔧 主要功能

### 1. 文档上传处理
- 支持拖拽上传
- 批量文件处理
- 格式自动识别

### 2. 课程内容生成
- 课程简介生成
- 学习目标制定
- 章节结构规划
- 知识点提取

### 3. 知识图谱
- 交互式编辑
- 3D可视化展示
- 学习路径规划

### 4. 质量保证
- 内容完整性验证
- 逻辑一致性检查
- 教育标准评估

## 📝 API文档

启动后端服务后，访问 http://localhost:8000/docs 查看Swagger文档。

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 👥 团队

- 开发团队：AI课程生成系统团队

## 📧 联系我们

- Email: contact@curriculum-ai.com
- Website: https://curriculum-ai.com