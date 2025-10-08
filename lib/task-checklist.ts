import { TaskType } from "@prisma/client"

/**
 * 任务完成勾选项规则引擎
 * 根据任务类型和关键词提供预设勾选选项，减少用户输入成本
 */

interface ChecklistRule {
  options: string[]
  keywords?: string[] // 用于进一步细化匹配
}

// 基础规则：按 TaskType 分类
const BASE_RULES: Record<TaskType, string[]> = {
  PRACTICE: [
    "完成所有练习题",
    "通过自测验证",
    "无错误运行代码",
    "理解核心概念",
    "做了笔记总结"
  ],

  PROJECT: [
    "完成核心功能开发",
    "代码已测试通过",
    "文档已更新",
    "代码已提交到仓库",
    "功能可正常演示"
  ],

  STUDY: [
    "阅读/观看完成",
    "做了学习笔记",
    "理解关键知识点",
    "完成课后思考题",
    "可以向他人解释"
  ],

  CHALLENGE: [
    "挑战题目已完成",
    "通过所有测试用例",
    "代码性能优化达标",
    "理解解题思路",
    "记录了解题过程"
  ],

  MILESTONE: [
    "阶段目标已达成",
    "输出可验证成果",
    "技能掌握度自评合格",
    "准备好进入下阶段",
    "完成复盘总结"
  ]
}

// 扩展规则：根据关键词细化（可选）
const KEYWORD_RULES: ChecklistRule[] = [
  {
    keywords: ['视频', 'video', '观看', 'watch'],
    options: ['观看完整视频', '记录关键时间点', '实践视频中的示例']
  },
  {
    keywords: ['文档', 'docs', '阅读', 'read', '书籍'],
    options: ['通读全文', '标注重点内容', '做了读书笔记']
  },
  {
    keywords: ['测试', 'test', 'unit test', '单元测试'],
    options: ['编写单元测试', '测试覆盖率达标', '所有测试通过']
  },
  {
    keywords: ['部署', 'deploy', 'production'],
    options: ['成功部署到环境', '验证线上功能', '监控运行状态']
  },
  {
    keywords: ['api', '接口', 'endpoint'],
    options: ['API 开发完成', '接口文档已写', 'Postman 测试通过']
  }
]

/**
 * 获取任务的勾选项列表
 * @param taskType 任务类型
 * @param taskTitle 任务标题（用于关键词匹配）
 * @returns 预设勾选选项数组
 */
export function getChecklistOptions(taskType: TaskType, taskTitle?: string): string[] {
  // 1. 获取基础选项
  const baseOptions = BASE_RULES[taskType] || []

  // 2. 如果没有标题，直接返回基础选项
  if (!taskTitle) {
    return baseOptions
  }

  // 3. 根据标题关键词匹配扩展选项
  const titleLower = taskTitle.toLowerCase()
  const matchedRule = KEYWORD_RULES.find(rule =>
    rule.keywords?.some(keyword => titleLower.includes(keyword.toLowerCase()))
  )

  // 4. 合并选项（扩展选项优先，避免重复）
  if (matchedRule) {
    const combined = [...matchedRule.options]
    baseOptions.forEach(opt => {
      if (!combined.includes(opt)) {
        combined.push(opt)
      }
    })
    return combined.slice(0, 6) // 最多返回 6 个选项
  }

  return baseOptions
}

/**
 * 将勾选的选项格式化为文本
 * @param selectedOptions 用户勾选的选项
 * @returns 格式化后的文本（用于追加到 submission）
 */
export function formatChecklistText(selectedOptions: string[]): string {
  if (selectedOptions.length === 0) return ''

  return selectedOptions.map(opt => `✓ ${opt}`).join('\n')
}
