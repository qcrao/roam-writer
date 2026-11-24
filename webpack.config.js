import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: "./src/index.ts",
  output: {
    filename: "extension.js",
    path: path.resolve(__dirname, "."),
    // Roam 以 ES module 方式加载 extension.js，必须输出 ESM（commonjs 会报 "exports is not defined"）
    library: { type: "module" },
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
