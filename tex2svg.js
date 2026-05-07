import transform from './transform.js'
import mathjax from 'mathjax'

async function init() {
  return mathjax.init({
    loader: {
      load: ['input/tex', 'output/svg'],
    },
    tex: {
      packages: ['base', 'autoload', 'require', 'ams', 'newcommand'],
    },
    svg: {
      fontCache: 'local'
    },
    startup: {
      typeset: false
    }
  })
}

async function tex2svg(tex, { fontSize = 16, backgroundColor = 'transparent', color = '#000000' } = {}) {
  const MathJax = await init()
  const texConfig = {
    display: true, // false 为行间公式
    em: 2 * fontSize,
    ex: fontSize,
    containerWidth: 80 * fontSize,
  }

  const svgReplace = [
    // 宽
    [/width="([^e]*)ex"/, (_, $1) => `width="${parseFloat($1) * fontSize}"`],
    // 高
    [/height="([^e]*)ex"/, (_, $1) => `height="${parseFloat($1) * fontSize}"`],
    // 颜色
    [/currentColor/g, color],
    // 背景色
    [/(style="[^"]*)"/, `\$1; background-color: ${backgroundColor}"`],
    // line 加粗
    [/(<line [^>]*class="mjx-solid")/g, '$1 style="stroke-width:50"'],
    // 报错文字背景色
    ['data-background="true"', 'fill="#fff"'],
    // & 转义
    [/&(?![#a-z0-9])/g, '&amp;'],
  ]

  const node = await MathJax.tex2svgPromise(tex, texConfig)
  // 丢弃结束标签 </svg> 后面的内容
  const match = MathJax.startup.adaptor.innerHTML(node).match(/.*<\/svg>/)
  if (!match) return ''
  let svg = match[0]

  // 正则替换
  svgReplace.forEach(arg => svg = svg.replace(...arg))

  // 去掉 <use> 标签及 svg 扁平化
  svg = transform(svg)
  return svg
}

export default tex2svg
