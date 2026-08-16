# Batch Solver

General twisty-puzzle algorithm-set generator.

## Run locally

Serve the repository root over HTTP, for example:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000/>.

The interface is implemented in `index.html`, `styles.css`, and `app.js`. The
solver runs in `BatchSolver/worker.js`. `algSpeed.js` and `twistysim.js` provide
algorithm scoring and 3x3 rendering respectively.

Full usage documentation is available in `BatchSolver/README.md`.
