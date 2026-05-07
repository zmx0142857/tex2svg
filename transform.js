import * as cheerio from 'cheerio'

// 解析 use 元素的引用 id
function getRefId($use) {
  let href = $use.attr('href') || $use.attr('xlink:href')
  if (href.startsWith('#')) href = href.slice(1)
  if (!href) return null
  return href
}

// 获取定义元素（在 defs 中查找）
function getDefinition($, id) {
  // 查找 <defs> 下 id 匹配的元素
  const def = $(`defs > #${id}, defs > *[id="${id}"]`).first()
  if (def.length) return def
  // 有些 SVG 直接在最外层根元素下定义（不规范），也尝试查找
  return $(`#${id}, *[id="${id}"]`).first()
}


// 合并属性：将 use 上的属性应用到目标元素上
// use 上的属性会覆盖定义元素中的同名属性
function mergeAttributes($use, $target) {
  const useAttrs = $use[0].attribs
  for (const [name, value] of Object.entries(useAttrs)) {
    // 跳过 use 特有的属性
    if (['href', 'xlink:href', 'x', 'y'].includes(name)) continue
    // 目标元素已有同名属性，直接覆盖
    $target.attr(name, value)
  }
}

// 处理 x, y 坐标：将其转换为 transform="translate(dx, dy)" 并合并现有 transform
function applyXY($use, $target) {
  const x = parseFloat($use.attr('x')) || 0
  const y = parseFloat($use.attr('y')) || 0
  if (x === 0 && y === 0) return

  // 合并：原有的变换放在前面还是后面？通常 use 的位置变换应在最外层
  $target.attr('transform', [
    `translate(${x}, ${y})`,
    $target.attr('transform') || ''
  ].filter(Boolean).join(' '))
}

// 内联单个 use 元素，返回布尔值表示是否成功
function inlineUse($, $use, visitedIds = new Set()) {
  const refId = getRefId($use)
  if (!refId) return false

  // 检测循环引用
  if (visitedIds.has(refId)) return !!console.warn(`警告：检测到循环引用，跳过 ${refId}`)
  visitedIds.add(refId)

  const $def = getDefinition($, refId)
  if (!$def.length) return !!console.warn(`警告：找不到 id 为 ${refId} 的定义元素，跳过`)

  // 深克隆定义元素（同时克隆其所有子元素）
  const $clone = $def.clone()
  // 移除克隆元素的 id，避免重复 id
  $clone.removeAttr('id')

  // 合并属性和位置
  mergeAttributes($use, $clone)
  applyXY($use, $clone)

  // 将克隆元素插入到原 use 的位置
  $use.replaceWith($clone)

  // 递归处理新插入元素中的 use（支持嵌套）
  $clone.find('use').each((_, nestedUse) => {
    inlineUse($, $(nestedUse), new Set(visitedIds))
  })

  return true
}

// 展开并移除 SVG 文件中的所有 use 元素
function inlineUses($) {
  // 处理所有 use 元素（注意：svg 可能包含多个 use）
  let loopCount = 100 // 防止无限循环（虽然递归已经处理，但作为安全措施）
  while (loopCount --> 0) {
    const $uses = $('use')
    if ($uses.length === 0) break
    // 注意：收集所有 use 再逐个处理，不要在遍历时修改 DOM
    const useList = []
    $uses.each((_, el) => useList.push(el))
    useList.forEach(el => inlineUse($, $(el)))
  }

  // 删除 <defs>
  $('defs').each((_, el) => $(el).remove())
}

/**
 * 递归处理节点，收集所有 path 元素（已合并样式和 transform）
 * @param {cheerio} $           cheerio 实例
 * @param {cheerio} $node       当前节点
 * @param {[]} parentTransform 父级累计的 transform
 * @param {object} parentAttr 父级属性
 * @returns {Array} 收集到的 path 元素（cheerio 元素列表）
 */
function collectPaths($, $node, parentTransform = [], parentAttr = {}) {
  let paths = []
  const currentTransform = $node.attr('transform') || ''
  const { tagName, attribs } = $node[0]
  const attrs = {}
  Object.entries(attribs).forEach(([key, value]) => {
    if (value && ['fill', 'stroke', 'stroke-width'].includes(key)) attrs[key] = value
  })
  if (tagName === 'g') {
    // 更新当前层 transform
    const newParentTransform = [...parentTransform, currentTransform]
    const newParentAttr = { ...parentAttr, ...attrs }
    // 递归处理子节点
    $node.children().each((_, child) => {
      paths = paths.concat(collectPaths($, $(child), newParentTransform, newParentAttr))
    })
  } else if (tagName === 'svg') {
    // 处理 x, y 偏移（转换为 translate）
    let translateXY = ''
    let x = parseFloat($node.attr('x')) || 0
    let y = parseFloat($node.attr('y')) || 0
    if (x !== 0 || y !== 0) {
      translateXY = `translate(${x}, ${y})`
    }
    // 处理 viewBox 和 width/height 带来的变换
    let viewBoxTransform = ''
    const viewBox = $node.attr('viewBox')
    if (viewBox) {
      const parts = viewBox.trim().split(/\s+/)
      if (parts.length === 4) {
        const [vx, vy, vw, vh] = parts.map(v => parseFloat(v))
        const width = parseFloat($node.attr('width')) || vw
        const height = parseFloat($node.attr('height')) || vh
        const sx = width / vw
        const sy = height / vh
        if (sx !== 1 || sy !== 1) {
          viewBoxTransform = `translate(${-vx * sx},${-vy * sy}) scale(${sx},${sy})`
        } else {
          viewBoxTransform = `translate(${-vx},${-vy})`
        }
      }
    }
    // 更新当前层 transform
    const newParentTransform = [...parentTransform, viewBoxTransform, translateXY, currentTransform]
    const newParentAttr = { ...parentAttr, ...attrs }
    // 递归处理子节点
    $node.children().each((_, child) => {
      paths = paths.concat(collectPaths($, $(child), newParentTransform, newParentAttr))
    })
  } else {
    // 合并 transform
    const finalTransform = [...parentTransform, currentTransform].map(v => v.trim()).filter(Boolean).join(' ')
    if (finalTransform) $node.attr('transform', finalTransform)
    // 合并属性
    Object.entries(parentAttr).forEach(([key, value]) => {
      if (value && !$node.attr(key)) $node.attr(key, value)
    })
    paths.push($node[0])
  }
  return paths
}

// 扁平化
function flatten($) {
  const $svg = $('svg').first()
  if ($svg.length === 0) throw new Error('找不到根元素 svg')
  const $g = $('svg > g').first()
  if ($g.length === 0) throw new Error('找不到元素 svg > g')

  // 收集所有 path，从 svg 的直接子元素开始递归
  let allPaths = []
  $g.children().each((_, child) => {
    allPaths = allPaths.concat(collectPaths($, $(child)))
  })

  // 清空 g 内部所有元素
  $g.children().each((_, child) => $(child).remove())

  // 将所有 path 添加到 g 中
  allPaths.forEach($path => $g.append($path))
}

// 主函数
function transform(svgContent) {
  const $ = cheerio.load(svgContent, {
    xmlMode: true, // 保持 XML 模式，不自动闭合标签等
    recognizeSelfClosing: true,
  })

  inlineUses($) // 清除 use
  flatten($) // 扁平化

  return $.xml()
}

export default transform
