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
  MathJax = await init()
  const texConfig = {
    display: true, // false 为行间公式
    em: 2 * fontSize,
    ex: fontSize,
    containerWidth: 80 * fontSize,
  }

  const svgReplace = [
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

  const node = MathJax.tex2svg(tex, texConfig)
  const dirtySvg = MathJax.startup.adaptor.innerHTML(node)
  const lastIndex = dirtySvg.lastIndexOf('</svg>')
  let svg = dirtySvg.slice(0, lastIndex + 6) // '</svg>'.length === 6

  // 宽高单位从 ex 改为 px
  const widthReg = /width="[^e]*ex"/
  const widthMatch = svg.match(widthReg)
  let width
  if (widthMatch) {
    width = parseFloat(widthMatch[0].slice(7)) * fontSize
    svg = svg.replace(widthReg, `width="${width}"`)
  }

  const heightReg = /height="[^e]*ex"/
  const heightMatch = svg.match(heightReg)
  let height
  if (heightMatch) {
    height = parseFloat(heightMatch[0].slice(8)) * fontSize
    svg = svg.replace(heightReg, `height="${height}"`)
  }

  // 其他正则替换
  svgReplace.forEach(arg => {
    svg = svg.replace(...arg)
  })

  // 去掉 <use> 标签
  svg = transform(svg)
  return svg
}

export default tex2svg
