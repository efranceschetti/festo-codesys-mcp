# NOTICE

FestoCodesysMCP — MCP Server for Festo CODESYS automation.

Copyright (c) 2025-2026 the FestoCodesysMCP contributors.
Licensed under the MIT License (see `package.json` `"license": "MIT"`).

---

## Third-party software included or wrapped

This project incorporates code and/or wraps APIs from the following
MIT-licensed projects. Their original copyright notices are preserved
below as required by the MIT License.

### codesys-mcp-toolkit (absorbed into this project)

IDE-driving tools (`ide_*`) and the IronPython script templates that talk
to the CODESYS V3.5 Scripting Engine were derived from:

- **Project:** codesys-mcp-toolkit
- **Author:** Johannes Pettersson
- **Repository:** https://github.com/johannesPettersson80/codesys-mcp-toolkit
- **License:** MIT

```
MIT License

Copyright (c) 2025 CODESYS MCP Server Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### festo-cpx-io (wrapped via the Python integration layer)

The `cpx_*` MCP tools wrap the Festo CPX-E/CPX-AP I/O SDK. The Python SDK
itself is installed as a `pip` dependency in `python/.venv/` and is not
redistributed; only its API is invoked through wrapper scripts.

- **Project:** festo-cpx-io
- **Author:** Festo SE & Co. KG
- **Repository:** https://github.com/Festo-se/festo-cpx-io
- **License:** MIT

```
MIT License

Copyright (c) 2022 Festo SE & Co. KG

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### festo-edcon (wrapped via the Python integration layer)

The `edcon_*` MCP tools wrap the Festo electric drives SDK (PROFIDRIVE).
Same install model as festo-cpx-io — pip dependency, not redistributed.

- **Project:** festo-edcon
- **Author:** Festo SE & Co. KG
- **Repository:** https://github.com/Festo-se/festo-edcon
- **License:** MIT

```
MIT License

Copyright (c) 2022 Festo SE & Co. KG

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
