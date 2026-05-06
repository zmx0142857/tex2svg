import am from 'asciimath-js'
import tex2svg from './tex2svg.js'
const { am2tex } = am

const { stdin, stdout } = process
const buf = []

stdin.setEncoding('utf8')

stdin.on('readable', () => {
  let data
  while ((data = stdin.read()) !== null) {
    buf.push(data.trim())
  }
})

const convert = process.argv.includes('--am')
  ? (input) => tex2svg(am2tex(input))
  : tex2svg

function onEnd () {
  const input = buf.join('\n')
  convert(input).then(svg => {
    console.log(svg)
    process.exit()
  })
}

stdin.on('end', onEnd)
process.on('SIGINT', onEnd)
