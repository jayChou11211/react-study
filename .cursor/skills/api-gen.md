# Task
根据 Swagger 文档生成前端 API 层

# Workflow
1. 使用 swagger.list_endpoints 查看接口
2. 找到目标接口
3. 使用 swagger.get_schema 获取类型
4. 生成：
   - API 请求函数
   - TypeScript 类型
   - React hooks（useXXX）

# Rules
- 使用 axios / fetch
- 类型必须完整
- hooks 需要包含 loading/error

# Output
- api.ts
- types.ts
- hooks.ts