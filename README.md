## Setup

`npm install` or `pnpm install`

## Usage

### tex to svg

`in.tex`
```text
\int_{-\infty}^\infty e^{-x^2} dx = \sqrt \pi
```

```sh
$ "node" index.js < in.tex > out.svg fontSize=10 backgroundColor=\#224488 color=\#ffffff
```

|选项|默认值|说明|
|-|-|-|
|backgroundColor|transparent|背景颜色|
|color|#000000|字体颜色|
|display|true|是否为行间公式 (大公式)|
|flat|true|是否进行 svg 扁平化|
|fontSize|16|字体大小|
|use|false|是否使用 `<use>` 标签|

### asciimath to svg

`in.am`
```text
int_0^oo e^-t t^(s-1) dt
```

```sh
$ "node" index.js --am < in.am > out.svg
```

> 可用的选项与 tex 相同

### python subprocess

```py
import subprocess

formula = r'a^2 + b^2 = c^2'
with open('out.svg', 'wb') as out:
    process = subprocess.Popen(['node', '/path/to/index.js'], stdin=subprocess.PIPE, stdout=out)
    process.stdin.write(bytes(formula + '\n', 'utf-8')) # make sure formula ends with \n
    process.stdin.close()
```
