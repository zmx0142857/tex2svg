## Setup

`npm install` or `pnpm install`

## Usage

### tex to svg

`in.tex`
```text
\int_{-\infty}^\infty e^{-x^2} dx = \sqrt \pi
```

```sh
$ "node" index.js < in.tex > out.svg
```

### asciimath to svg

`in.am`
```text
int_0^oo e^-t t^(s-1) dt
```

```sh
$ "node" index.js --am < in.am > out.svg
```

### python subprocess

```py
import subprocess

formula = r'a^2 + b^2 = c^2'
with open('out.svg', 'wb') as out:
    process = subprocess.Popen(['node', '/path/to/index.js'], stdin=subprocess.PIPE, stdout=out)
    process.stdin.write(bytes(formula + '\n', 'utf-8')) # make sure formula ends with \n
    process.stdin.close()
```
