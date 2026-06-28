var __sdk_react = window.__HERMES_PLUGIN_SDK__ && window.__HERMES_PLUGIN_SDK__.React || {};
var __sdk_jsx = {
	jsx: __sdk_react.createElement,
	jsxs: __sdk_react.createElement,
	Fragment: __sdk_react.Fragment
};
(function(react, react_jsx_runtime) {
	//#region node_modules/lucide-react/dist/esm/shared/src/utils.js
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
	var toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
	var toPascalCase = (string) => {
		const camelCase = toCamelCase(string);
		return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
	};
	var mergeClasses = (...classes) => classes.filter((className, index, array) => {
		return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
	}).join(" ").trim();
	var hasA11yProp = (props) => {
		for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
	};
	//#endregion
	//#region node_modules/lucide-react/dist/esm/defaultAttributes.js
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var defaultAttributes = {
		xmlns: "http://www.w3.org/2000/svg",
		width: 24,
		height: 24,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round"
	};
	//#endregion
	//#region node_modules/lucide-react/dist/esm/Icon.js
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Icon = (0, react.forwardRef)(({ color = "currentColor", size = 24, strokeWidth = 2, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => (0, react.createElement)("svg", {
		ref,
		...defaultAttributes,
		width: size,
		height: size,
		stroke: color,
		strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
		className: mergeClasses("lucide", className),
		...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
		...rest
	}, [...iconNode.map(([tag, attrs]) => (0, react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]));
	//#endregion
	//#region node_modules/lucide-react/dist/esm/createLucideIcon.js
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var createLucideIcon = (iconName, iconNode) => {
		const Component = (0, react.forwardRef)(({ className, ...props }, ref) => (0, react.createElement)(Icon, {
			ref,
			iconNode,
			className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
			...props
		}));
		Component.displayName = toPascalCase(iconName);
		return Component;
	};
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var ChartColumn = createLucideIcon("chart-column", [
		["path", {
			d: "M3 3v16a2 2 0 0 0 2 2h16",
			key: "c24i48"
		}],
		["path", {
			d: "M18 17V9",
			key: "2bz60n"
		}],
		["path", {
			d: "M13 17V5",
			key: "1frdt8"
		}],
		["path", {
			d: "M8 17v-3",
			key: "17ska0"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var CircleAlert = createLucideIcon("circle-alert", [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10",
			key: "1mglay"
		}],
		["line", {
			x1: "12",
			x2: "12",
			y1: "8",
			y2: "12",
			key: "1pkeuh"
		}],
		["line", {
			x1: "12",
			x2: "12.01",
			y1: "16",
			y2: "16",
			key: "4dfq90"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var CircleCheck = createLucideIcon("circle-check", [["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}], ["path", {
		d: "m9 12 2 2 4-4",
		key: "dzmm74"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var CircleX = createLucideIcon("circle-x", [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10",
			key: "1mglay"
		}],
		["path", {
			d: "m15 9-6 6",
			key: "1uzhvr"
		}],
		["path", {
			d: "m9 9 6 6",
			key: "z0biqf"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var LoaderCircle = createLucideIcon("loader-circle", [["path", {
		d: "M21 12a9 9 0 1 1-6.219-8.56",
		key: "13zald"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var TriangleAlert = createLucideIcon("triangle-alert", [
		["path", {
			d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
			key: "wmoenq"
		}],
		["path", {
			d: "M12 9v4",
			key: "juzpu7"
		}],
		["path", {
			d: "M12 17h.01",
			key: "p32p05"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var BookOpen = createLucideIcon("book-open", [["path", {
		d: "M12 7v14",
		key: "1akyts"
	}], ["path", {
		d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
		key: "ruj8y"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Box = createLucideIcon("box", [
		["path", {
			d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
			key: "hh9hay"
		}],
		["path", {
			d: "m3.3 7 8.7 5 8.7-5",
			key: "g66t2b"
		}],
		["path", {
			d: "M12 22V12",
			key: "d0xqtd"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Brain = createLucideIcon("brain", [
		["path", {
			d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",
			key: "l5xja"
		}],
		["path", {
			d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z",
			key: "ep3f8r"
		}],
		["path", {
			d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4",
			key: "1p4c4q"
		}],
		["path", {
			d: "M17.599 6.5a3 3 0 0 0 .399-1.375",
			key: "tmeiqw"
		}],
		["path", {
			d: "M6.003 5.125A3 3 0 0 0 6.401 6.5",
			key: "105sqy"
		}],
		["path", {
			d: "M3.477 10.896a4 4 0 0 1 .585-.396",
			key: "ql3yin"
		}],
		["path", {
			d: "M19.938 10.5a4 4 0 0 1 .585.396",
			key: "1qfode"
		}],
		["path", {
			d: "M6 18a4 4 0 0 1-1.967-.516",
			key: "2e4loj"
		}],
		["path", {
			d: "M19.967 17.484A4 4 0 0 1 18 18",
			key: "159ez6"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var ChevronDown = createLucideIcon("chevron-down", [["path", {
		d: "m6 9 6 6 6-6",
		key: "qrunsl"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var ChevronRight = createLucideIcon("chevron-right", [["path", {
		d: "m9 18 6-6-6-6",
		key: "mthhwq"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Clock = createLucideIcon("clock", [["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}], ["polyline", {
		points: "12 6 12 12 16 14",
		key: "68esgv"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Download = createLucideIcon("download", [
		["path", {
			d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
			key: "ih7n3h"
		}],
		["polyline", {
			points: "7 10 12 15 17 10",
			key: "2ggqvy"
		}],
		["line", {
			x1: "12",
			x2: "12",
			y1: "15",
			y2: "3",
			key: "1vk2je"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var EyeOff = createLucideIcon("eye-off", [
		["path", {
			d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
			key: "ct8e1f"
		}],
		["path", {
			d: "M14.084 14.158a3 3 0 0 1-4.242-4.242",
			key: "151rxh"
		}],
		["path", {
			d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
			key: "13bj9a"
		}],
		["path", {
			d: "m2 2 20 20",
			key: "1ooewy"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Eye = createLucideIcon("eye", [["path", {
		d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
		key: "1nclc0"
	}], ["circle", {
		cx: "12",
		cy: "12",
		r: "3",
		key: "1v7zrd"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var FileText = createLucideIcon("file-text", [
		["path", {
			d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
			key: "1rqfz7"
		}],
		["path", {
			d: "M14 2v4a2 2 0 0 0 2 2h4",
			key: "tnqrlb"
		}],
		["path", {
			d: "M10 9H8",
			key: "b1mrlr"
		}],
		["path", {
			d: "M16 13H8",
			key: "t4e002"
		}],
		["path", {
			d: "M16 17H8",
			key: "z1uh3a"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var GitCompare = createLucideIcon("git-compare", [
		["circle", {
			cx: "18",
			cy: "18",
			r: "3",
			key: "1xkwt0"
		}],
		["circle", {
			cx: "6",
			cy: "6",
			r: "3",
			key: "1lh9wr"
		}],
		["path", {
			d: "M13 6h3a2 2 0 0 1 2 2v7",
			key: "1yeb86"
		}],
		["path", {
			d: "M11 18H8a2 2 0 0 1-2-2V9",
			key: "19pyzm"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Github = createLucideIcon("github", [["path", {
		d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
		key: "tonef"
	}], ["path", {
		d: "M9 18c-4.51 2-5-2-7-2",
		key: "9comsn"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Globe = createLucideIcon("globe", [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10",
			key: "1mglay"
		}],
		["path", {
			d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
			key: "13o1zl"
		}],
		["path", {
			d: "M2 12h20",
			key: "9i4pu4"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Hash = createLucideIcon("hash", [
		["line", {
			x1: "4",
			x2: "20",
			y1: "9",
			y2: "9",
			key: "4lhtct"
		}],
		["line", {
			x1: "4",
			x2: "20",
			y1: "15",
			y2: "15",
			key: "vyu0kd"
		}],
		["line", {
			x1: "10",
			x2: "8",
			y1: "3",
			y2: "21",
			key: "1ggp8o"
		}],
		["line", {
			x1: "16",
			x2: "14",
			y1: "3",
			y2: "21",
			key: "weycgp"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Link2 = createLucideIcon("link-2", [
		["path", {
			d: "M9 17H7A5 5 0 0 1 7 7h2",
			key: "8i5ue5"
		}],
		["path", {
			d: "M15 7h2a5 5 0 1 1 0 10h-2",
			key: "1b9ql8"
		}],
		["line", {
			x1: "8",
			x2: "16",
			y1: "12",
			y2: "12",
			key: "1jonct"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var List = createLucideIcon("list", [
		["path", {
			d: "M3 12h.01",
			key: "nlz23k"
		}],
		["path", {
			d: "M3 18h.01",
			key: "1tta3j"
		}],
		["path", {
			d: "M3 6h.01",
			key: "1rqtza"
		}],
		["path", {
			d: "M8 12h13",
			key: "1za7za"
		}],
		["path", {
			d: "M8 18h13",
			key: "1lx6n3"
		}],
		["path", {
			d: "M8 6h13",
			key: "ik3vkj"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var RefreshCw = createLucideIcon("refresh-cw", [
		["path", {
			d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
			key: "v9h5vc"
		}],
		["path", {
			d: "M21 3v5h-5",
			key: "1q7to0"
		}],
		["path", {
			d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
			key: "3uifl3"
		}],
		["path", {
			d: "M8 16H3v5",
			key: "1cv678"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var RotateCw = createLucideIcon("rotate-cw", [["path", {
		d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",
		key: "1p45f6"
	}], ["path", {
		d: "M21 3v5h-5",
		key: "1q7to0"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Search = createLucideIcon("search", [["path", {
		d: "m21 21-4.34-4.34",
		key: "14j7rj"
	}], ["circle", {
		cx: "11",
		cy: "11",
		r: "8",
		key: "4ej97u"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Settings = createLucideIcon("settings", [["path", {
		d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
		key: "1qme2f"
	}], ["circle", {
		cx: "12",
		cy: "12",
		r: "3",
		key: "1v7zrd"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Share2 = createLucideIcon("share-2", [
		["circle", {
			cx: "18",
			cy: "5",
			r: "3",
			key: "gq8acd"
		}],
		["circle", {
			cx: "6",
			cy: "12",
			r: "3",
			key: "w7nqdw"
		}],
		["circle", {
			cx: "18",
			cy: "19",
			r: "3",
			key: "1xt0gg"
		}],
		["line", {
			x1: "8.59",
			x2: "15.42",
			y1: "13.51",
			y2: "17.49",
			key: "47mynk"
		}],
		["line", {
			x1: "15.41",
			x2: "8.59",
			y1: "6.51",
			y2: "10.49",
			key: "1n3mei"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var SkipForward = createLucideIcon("skip-forward", [["polygon", {
		points: "5 4 15 12 5 20 5 4",
		key: "16p6eg"
	}], ["line", {
		x1: "19",
		x2: "19",
		y1: "5",
		y2: "19",
		key: "futhcm"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Square = createLucideIcon("square", [["rect", {
		width: "18",
		height: "18",
		x: "3",
		y: "3",
		rx: "2",
		key: "afitv7"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Tags = createLucideIcon("tags", [
		["path", {
			d: "m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19",
			key: "1cbfv1"
		}],
		["path", {
			d: "M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z",
			key: "135mg7"
		}],
		["circle", {
			cx: "6.5",
			cy: "9.5",
			r: ".5",
			fill: "currentColor",
			key: "5pm5xn"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Trash2 = createLucideIcon("trash-2", [
		["path", {
			d: "M3 6h18",
			key: "d0wm0j"
		}],
		["path", {
			d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",
			key: "4alrt4"
		}],
		["path", {
			d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
			key: "v07s0e"
		}],
		["line", {
			x1: "10",
			x2: "10",
			y1: "11",
			y2: "17",
			key: "1uufr5"
		}],
		["line", {
			x1: "14",
			x2: "14",
			y1: "11",
			y2: "17",
			key: "xtxkd"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Upload = createLucideIcon("upload", [
		["path", {
			d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
			key: "ih7n3h"
		}],
		["polyline", {
			points: "17 8 12 3 7 8",
			key: "t8dd8p"
		}],
		["line", {
			x1: "12",
			x2: "12",
			y1: "3",
			y2: "15",
			key: "widbto"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var X = createLucideIcon("x", [["path", {
		d: "M18 6 6 18",
		key: "1bl5f8"
	}], ["path", {
		d: "m6 6 12 12",
		key: "d8bk6v"
	}]]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var ZoomIn = createLucideIcon("zoom-in", [
		["circle", {
			cx: "11",
			cy: "11",
			r: "8",
			key: "4ej97u"
		}],
		["line", {
			x1: "21",
			x2: "16.65",
			y1: "21",
			y2: "16.65",
			key: "13gj7c"
		}],
		["line", {
			x1: "11",
			x2: "11",
			y1: "8",
			y2: "14",
			key: "1vmskp"
		}],
		["line", {
			x1: "8",
			x2: "14",
			y1: "11",
			y2: "11",
			key: "durymu"
		}]
	]);
	/**
	* @license lucide-react v0.507.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var ZoomOut = createLucideIcon("zoom-out", [
		["circle", {
			cx: "11",
			cy: "11",
			r: "8",
			key: "4ej97u"
		}],
		["line", {
			x1: "21",
			x2: "16.65",
			y1: "21",
			y2: "16.65",
			key: "13gj7c"
		}],
		["line", {
			x1: "8",
			x2: "14",
			y1: "11",
			y2: "11",
			key: "durymu"
		}]
	]);
	//#endregion
	//#region src/api.ts
	var PLUGIN = "/api/plugins/llm-wiki";
	function getSDK() {
		return window.__HERMES_PLUGIN_SDK__;
	}
	async function apiFetch(url, init) {
		const sdk = getSDK();
		if (sdk?.authedFetch) return sdk.authedFetch(url, init);
		return fetch(url, init);
	}
	async function apiJSON(url, init) {
		const sdk = getSDK();
		if (sdk?.fetchJSON) return sdk.fetchJSON(url, init);
		const res = await fetch(url, init);
		if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
		return res.json();
	}
	var wiki = {
		stats: () => apiJSON(`${PLUGIN}/stats`),
		pages: (params) => apiJSON(`${PLUGIN}/pages${params ? `?${params}` : ""}`),
		page: (path) => apiJSON(`${PLUGIN}/pages/${path}`),
		deletePage: (path) => apiFetch(`${PLUGIN}/pages/${encodeURIComponent(path)}`, { method: "DELETE" }),
		graph: () => apiJSON(`${PLUGIN}/graph`),
		timeline: (limit = 20) => apiJSON(`${PLUGIN}/timeline?limit=${limit}`),
		allTags: () => apiJSON(`${PLUGIN}/all-tags`),
		tags: () => apiJSON(`${PLUGIN}/tags`),
		validateTags: (tags) => apiJSON(`${PLUGIN}/validate-tags?tags=${encodeURIComponent(tags)}`),
		importUrl: (body) => apiFetch(`${PLUGIN}/import-url`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		}),
		uploadFile: (form, type = "auto", force = false) => apiFetch(`${PLUGIN}/upload?type=${encodeURIComponent(String(type))}&force=${force}`, {
			method: "POST",
			body: form
		}),
		analysisProgress: (taskId) => apiJSON(`${PLUGIN}/analysis-progress/${taskId}`)
	};
	var github = {
		status: () => apiJSON(`${PLUGIN}/github/status`),
		saveConfig: (body) => apiJSON(`${PLUGIN}/github/config`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		}),
		push: (body) => apiJSON(`${PLUGIN}/github/push`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		}),
		pull: () => apiJSON(`${PLUGIN}/github/pull`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({})
		})
	};
	//#endregion
	//#region src/pages/WikiOverview.tsx
	function WikiOverview({ onNavigate }) {
		const [stats, setStats] = (0, react.useState)(null);
		const [timeline, setTimeline] = (0, react.useState)([]);
		const [loading, setLoading] = (0, react.useState)(true);
		const [error, setError] = (0, react.useState)(null);
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const [s, t] = await Promise.all([wiki.stats(), wiki.timeline(10)]);
				setStats(s);
				setTimeline(t.entries ?? t ?? []);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to load stats");
			} finally {
				setLoading(false);
			}
		}
		(0, react.useEffect)(() => {
			load();
		}, []);
		const statCards = (0, react.useMemo)(() => [
			{
				icon: BookOpen,
				label: "Total Pages",
				value: stats?.totalPages ?? null,
				tab: "pages"
			},
			{
				icon: FileText,
				label: "Entities",
				value: stats?.entitiesCount ?? null
			},
			{
				icon: Brain,
				label: "Concepts",
				value: stats?.conceptsCount ?? null
			},
			{
				icon: GitCompare,
				label: "Comparisons",
				value: stats?.comparisonsCount ?? null
			},
			{
				icon: Link2,
				label: "Orphan Pages",
				value: stats?.orphanCount ?? null
			},
			{
				icon: Tags,
				label: "Tags",
				value: stats?.tagCount ?? null,
				tab: "tags"
			}
		], [stats]);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BookOpen, { className: "h-5 w-5 text-text-secondary" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
								className: "text-xl font-bold text-text-primary",
								children: "Wiki Overview"
							}),
							stats?.updated && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "ml-2 text-xs text-text-tertiary",
								children: ["Updated: ", stats.updated]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						onClick: () => void load(),
						className: "flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5" }), " 重新整理"]
					})]
				}),
				loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-center py-16",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin text-text-tertiary" })
				}),
				error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "rounded-lg border border-red-400/20 bg-red-400/5 p-4",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "text-sm text-red-400",
						children: error
					})
				}),
				!loading && !error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6",
					children: statCards.map((card) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
						icon: card.icon,
						label: card.label,
						value: card.value ?? 0,
						onClick: card.tab ? () => onNavigate(card.tab) : void 0
					}, card.label))
				}),
				!loading && !error && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-sm font-medium text-text-secondary",
					children: "最近活動"
				}), timeline.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "text-sm text-text-tertiary",
					children: "尚無活動記錄"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: "space-y-2 max-w-md",
					children: timeline.map((entry, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: "flex items-start gap-3 rounded-lg border border-current/10 bg-current/5 p-3",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Clock, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium truncate",
								children: entry.subject
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "text-xs text-text-tertiary",
								children: [
									entry.action,
									" · ",
									entry.date
								]
							})]
						})]
					}, i))
				})] })
			]
		});
	}
	function StatCard({ icon: Icon, label, value, onClick }) {
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			onClick,
			className: `rounded-lg border border-current/10 bg-current/5 p-4 ${onClick ? "cursor-pointer hover:bg-current/10 transition-colors" : ""}`,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-text-tertiary",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "text-xs",
					children: label
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "mt-1 text-2xl font-semibold",
				children: value
			})]
		});
	}
	//#endregion
	//#region src/components/WikiPageDetail.tsx
	function fmtDate$1(d) {
		if (!d) return "—";
		try {
			const date = new Date(d);
			if (isNaN(date.getTime())) return d;
			return date.toLocaleString(void 0, {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			});
		} catch {
			return d;
		}
	}
	function WikiPageDetail({ pagePath, onClose, onDelete }) {
		const [page, setPage] = (0, react.useState)(null);
		const [loading, setLoading] = (0, react.useState)(true);
		const [error, setError] = (0, react.useState)(null);
		(0, react.useEffect)(() => {
			let cancelled = false;
			setLoading(true);
			setError(null);
			setPage(null);
			wiki.page(encodeURIComponent(pagePath)).then((data) => {
				if (!cancelled) {
					setPage(data);
					setLoading(false);
				}
			}).catch((err) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load page");
					setLoading(false);
				}
			});
			return () => {
				cancelled = true;
			};
		}, [pagePath]);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border border-current/10 bg-background-base/50 p-4",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mb-4 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 min-w-0",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileText, { className: "h-4 w-4 shrink-0 text-text-secondary" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: "truncate text-sm font-semibold text-text-primary",
								children: page?.title ?? pagePath
							}),
							page?.type && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "shrink-0 rounded bg-current/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary",
								children: page.type
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [onDelete && page && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: () => onDelete(pagePath),
							className: "shrink-0 rounded p-1 text-red-400 hover:bg-red-400/10",
							title: `Delete "${page?.title || pagePath}"`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "shrink-0 text-text-tertiary hover:text-text-primary",
							"aria-label": "Close detail panel",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
						})]
					})]
				}),
				loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-center py-8",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin text-text-tertiary" })
				}),
				error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "text-xs text-red-400",
					children: error
				}),
				!loading && !error && page && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "flex gap-4 text-xs text-text-tertiary",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Created: ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: fmtDate$1(page.created) })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Updated: ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: fmtDate$1(page.updated) })] })]
						}),
						page.tags.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: page.tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "rounded bg-current/10 px-1.5 py-0.5 text-[10px] text-text-secondary",
								children: tag
							}, tag))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
							className: "mb-1 text-xs font-semibold text-text-secondary",
							children: "Frontmatter"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "rounded border border-current/10 p-3 font-mono text-xs",
							children: [Object.entries(page.frontmatter).map(([key, val]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "shrink-0 text-text-tertiary",
									children: [key, ":"]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "truncate text-text-primary",
									children: Array.isArray(val) ? val.join(", ") : String(val ?? "")
								})]
							}, key)), Object.keys(page.frontmatter).length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "italic text-text-tertiary",
								children: "No frontmatter"
							})]
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "flex gap-4 text-xs text-text-secondary",
							children: [page.inboundLinks.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Inbound: ", page.inboundLinks.join(", ")] }), page.outboundLinks.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Outbound: ", page.outboundLinks.join(", ")] })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
							className: "mb-1 text-xs font-semibold text-text-secondary",
							children: "Markdown Content"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: "max-h-96 overflow-auto rounded border border-current/10 p-3 font-mono text-xs leading-relaxed text-text-primary whitespace-pre-wrap break-words",
							children: page.content || /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "italic text-text-tertiary",
								children: "(empty)"
							})
						})] })
					]
				})
			]
		});
	}
	//#endregion
	//#region src/pages/WikiPageList.tsx
	function fmtDate(d) {
		if (!d) return "—";
		try {
			const date = new Date(d);
			if (isNaN(date.getTime())) return d;
			if (d.includes("T") || d.includes(" ")) return date.toLocaleString(void 0, {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			});
			return date.toLocaleDateString(void 0, {
				year: "numeric",
				month: "short",
				day: "numeric"
			});
		} catch {
			return d;
		}
	}
	function PageFilterBar({ filters, allTags, onChange }) {
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex flex-wrap gap-2",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					value: filters.type,
					onChange: (e) => onChange({
						...filters,
						type: e.target.value
					}),
					className: "rounded-md border border-current/20 bg-current/5 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-current/40 transition-colors",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: "所有類型"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "note",
							children: "note"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "concept",
							children: "concept"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "guide",
							children: "guide"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "reference",
							children: "reference"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "api",
							children: "api"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					value: filters.tag,
					onChange: (e) => onChange({
						...filters,
						tag: e.target.value
					}),
					className: "rounded-md border border-current/20 bg-current/5 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-current/40 transition-colors",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: "所有標籤"
					}), allTags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: tag,
						children: tag
					}, tag))]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					value: filters.confidence,
					onChange: (e) => onChange({
						...filters,
						confidence: e.target.value
					}),
					className: "rounded-md border border-current/20 bg-current/5 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-current/40 transition-colors",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: "所有信心度"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "high",
							children: "high"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "medium",
							children: "medium"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "low",
							children: "low"
						})
					]
				}),
				(filters.type || filters.tag || filters.confidence) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					onClick: () => onChange({
						type: "",
						tag: "",
						confidence: ""
					}),
					className: "rounded-md border border-current/20 px-2.5 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors",
					children: "清除篩選"
				})
			]
		});
	}
	function WikiPageList({ onNavigate, onRefresh }) {
		const [pages, setPages] = (0, react.useState)([]);
		const [loading, setLoading] = (0, react.useState)(true);
		const [error, setError] = (0, react.useState)(null);
		const [filters, setFilters] = (0, react.useState)({
			type: "",
			tag: "",
			confidence: ""
		});
		const [selectedPath, setSelectedPath] = (0, react.useState)(null);
		const [deleting, setDeleting] = (0, react.useState)(null);
		const loadPages = (0, react.useCallback)(() => {
			let cancelled = false;
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (filters.type) params.set("type", filters.type);
			if (filters.tag) params.set("tag", filters.tag);
			if (filters.confidence) params.set("confidence", filters.confidence);
			params.set("sort", "updated");
			params.set("order", "desc");
			wiki.pages(params.toString()).then((data) => {
				if (!cancelled) {
					setPages(data.pages ?? data ?? []);
					setLoading(false);
				}
			}).catch((err) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load pages");
					setLoading(false);
				}
			});
			return () => {
				cancelled = true;
			};
		}, [filters]);
		(0, react.useEffect)(() => {
			return loadPages();
		}, [loadPages]);
		const handleDelete = async (path, title) => {
			if (!confirm(`Delete "${title || path}"? This cannot be undone.`)) return;
			setDeleting(path);
			try {
				const res = await wiki.deletePage(path);
				if (!res.ok) {
					const err = await res.json().catch(() => null);
					throw new Error(err?.detail ?? `Delete failed (${res.status})`);
				}
				setPages((prev) => prev.filter((p) => p.path !== path));
				if (selectedPath === path) setSelectedPath(null);
				onRefresh();
			} catch (err) {
				alert(err instanceof Error ? err.message : "Failed to delete page");
			} finally {
				setDeleting(null);
			}
		};
		const allTags = (0, react.useMemo)(() => {
			const tagSet = /* @__PURE__ */ new Set();
			for (const p of pages) for (const t of p.tags) tagSet.add(t);
			return Array.from(tagSet).sort();
		}, [pages]);
		const header = (0, react.useMemo)(() => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "mb-6 flex items-center gap-2",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileText, { className: "h-5 w-5 text-text-secondary" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
					className: "text-xl font-bold text-text-primary",
					children: "Wiki Pages"
				}),
				!loading && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "text-xs text-text-tertiary",
					children: [
						pages.length,
						" page",
						pages.length !== 1 ? "s" : ""
					]
				})
			]
		}), [loading, pages.length]);
		const confidenceColor = (level) => {
			switch (level) {
				case "high": return "text-green-400";
				case "medium": return "text-yellow-400";
				case "low": return "text-red-400";
				default: return "text-text-tertiary";
			}
		};
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
			header,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageFilterBar, {
				filters,
				allTags,
				onChange: setFilters
			}),
			loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-center py-16",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin text-text-tertiary" })
			}),
			error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "rounded-lg border border-red-400/20 bg-red-400/5 p-4",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "text-sm text-red-400",
					children: error
				})
			}),
			!loading && !error && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4 lg:flex-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "min-w-0 flex-1 overflow-x-auto",
					children: pages.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "py-8 text-center",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "text-sm text-text-tertiary",
							children: filters.type || filters.tag || filters.confidence ? "No pages match the current filters." : "尚無 Wiki 頁面"
						}), !filters.type && !filters.tag && !filters.confidence && onNavigate && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: () => onNavigate("upload"),
							className: "mt-2 text-xs text-text-secondary hover:text-text-primary transition-colors underline",
							children: "前往匯入頁面"
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: "w-full text-left text-sm",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
							className: "border-b border-current/10 text-xs uppercase tracking-wider text-text-tertiary",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "pb-2 pr-2 font-medium",
									children: "Title"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "pb-2 pr-2 font-medium",
									children: "Type"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "hidden pb-2 pr-2 font-medium sm:table-cell",
									children: "Tags"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "hidden pb-2 pr-2 font-medium sm:table-cell",
									children: "Confidence"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "hidden pb-2 pr-2 font-medium md:table-cell",
									children: "Created"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "hidden pb-2 pr-2 font-medium md:table-cell",
									children: "Updated"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "pb-2 pr-2 font-medium text-right",
									children: "Links"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "pb-2 pl-2 font-medium text-right",
									children: "Actions"
								})
							]
						}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: pages.map((page) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
							className: `group/row cursor-pointer border-b border-current/5 transition-colors hover:bg-current/5 ${selectedPath === page.path ? "bg-current/10" : ""}`,
							onClick: () => setSelectedPath(selectedPath === page.path ? null : page.path),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "py-2 pr-2 font-medium text-text-primary truncate max-w-[200px]",
									children: page.title || page.path
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "py-2 pr-2",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "rounded bg-current/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary",
										children: page.type || "—"
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "hidden py-2 pr-2 sm:table-cell",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "truncate text-xs text-text-secondary",
										children: [page.tags.length > 0 ? page.tags.slice(0, 3).join(", ") : "—", page.tags.length > 3 && " …"]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: `hidden py-2 pr-2 sm:table-cell ${confidenceColor(page.confidence)}`,
									children: page.confidence || "—"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "hidden py-2 pr-2 text-xs text-text-tertiary md:table-cell",
									children: fmtDate(page.created)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "hidden py-2 pr-2 text-xs text-text-tertiary md:table-cell",
									children: fmtDate(page.updated)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "py-2 text-right text-xs text-text-secondary",
									children: page.inbound_link_count ?? page.inboundLinks?.length ?? 0
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "py-2 pl-2 text-right",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										onClick: (e) => {
											e.stopPropagation();
											handleDelete(page.path, page.title);
										},
										disabled: deleting === page.path,
										className: "rounded p-1 text-red-400 opacity-0 transition-opacity hover:bg-red-400/10 group-hover/row:opacity-100",
										title: `Delete "${page.title || page.path}"`,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
									})
								})
							]
						}, page.path)) })]
					})
				}), selectedPath && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "w-full shrink-0 lg:w-96",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiPageDetail, {
						pagePath: selectedPath,
						onClose: () => setSelectedPath(null),
						onDelete: (path) => void handleDelete(path, path)
					})
				})]
			})
		] });
	}
	//#endregion
	//#region src/pages/WikiUpload.tsx
	var DOC_TYPES = [
		"auto",
		"entity",
		"concept",
		"comparison",
		"query"
	];
	var UPLOAD_TYPES = [
		"entity",
		"concept",
		"comparison",
		"query"
	];
	var STEP_LABELS = {
		content_extraction: "Content Extraction",
		language_detection: "Language Detection",
		tag_analysis: "Tag Analysis",
		relation_analysis: "Relation Analysis",
		registry_update: "Tag Registry Update",
		complete: "Complete"
	};
	function stepLabel(key) {
		return STEP_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	}
	function ProgressBar({ value }) {
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "mb-3 h-2 w-full overflow-hidden rounded-full bg-current/10",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "h-full rounded-full bg-midground transition-all duration-500 ease-out",
				style: { width: `${Math.max(0, Math.min(100, value))}%` }
			})
		});
	}
	async function pollUntilDone(taskId) {
		return new Promise((resolve, reject) => {
			const iv = setInterval(async () => {
				try {
					const data = await wiki.analysisProgress(taskId);
					if (data.status === "complete" && data.result) {
						clearInterval(iv);
						resolve(data.result);
					} else if (data.status === "failed") {
						clearInterval(iv);
						reject(new Error(data.error ?? "Analysis failed"));
					}
				} catch (e) {
					clearInterval(iv);
					reject(e);
				}
			}, 2e3);
		});
	}
	async function importOneUrl(url, docType, force) {
		try {
			const res = await wiki.importUrl({
				url,
				type: docType,
				force
			});
			if (res.status === 409) {
				const body = await res.json().catch(() => ({}));
				return {
					kind: "conflict",
					existingPath: body.detail?.existing_path ?? "",
					message: body.detail?.message ?? "已存在"
				};
			}
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				return {
					kind: "error",
					message: body?.detail ?? body?.message ?? `HTTP ${res.status}`
				};
			}
			const body = await res.json();
			if (body.task_id) return {
				kind: "success",
				path: (await pollUntilDone(body.task_id)).path
			};
			return {
				kind: "success",
				path: body.path ?? ""
			};
		} catch (e) {
			return {
				kind: "error",
				message: e instanceof Error ? e.message : String(e)
			};
		}
	}
	function BatchImport({ docType, onRefresh }) {
		const [rawText, setRawText] = (0, react.useState)("");
		const [rows, setRows] = (0, react.useState)([]);
		const [running, setRunning] = (0, react.useState)(false);
		const abortRef = (0, react.useRef)(false);
		const updateRow = (0, react.useCallback)((id, patch) => {
			setRows((prev) => prev.map((r) => r.id === id ? {
				...r,
				...patch
			} : r));
		}, []);
		const parseUrls = () => rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && (l.startsWith("http://") || l.startsWith("https://")));
		const handleStart = async () => {
			const urls = parseUrls();
			if (urls.length === 0) return;
			const initial = urls.map((url, i) => ({
				id: i,
				url,
				status: "pending",
				message: ""
			}));
			setRows(initial);
			setRunning(true);
			abortRef.current = false;
			for (let i = 0; i < initial.length; i++) {
				if (abortRef.current) {
					setRows((prev) => prev.map((r) => r.status === "pending" ? {
						...r,
						status: "skipped",
						message: "已中止"
					} : r));
					break;
				}
				const row = initial[i];
				updateRow(row.id, {
					status: "processing",
					message: ""
				});
				const outcome = await importOneUrl(row.url, docType, false);
				if (outcome.kind === "success") {
					updateRow(row.id, {
						status: "success",
						message: outcome.path,
						path: outcome.path
					});
					onRefresh();
				} else if (outcome.kind === "conflict") {
					updateRow(row.id, {
						status: "conflict",
						message: outcome.message,
						existingPath: outcome.existingPath
					});
					await new Promise((resolve) => {
						const check = setInterval(() => {
							setRows((prev) => {
								const r = prev.find((x) => x.id === row.id);
								if (r && r.status !== "conflict") {
									clearInterval(check);
									resolve();
								}
								return prev;
							});
						}, 300);
					});
				} else updateRow(row.id, {
					status: "error",
					message: outcome.message
				});
			}
			setRunning(false);
		};
		const handleStop = () => {
			abortRef.current = true;
		};
		const handleReset = () => {
			setRows([]);
			setRunning(false);
			abortRef.current = false;
		};
		const handleOverwrite = async (id, url) => {
			updateRow(id, {
				status: "processing",
				message: "覆蓋中…"
			});
			const outcome = await importOneUrl(url, docType, true);
			if (outcome.kind === "success") {
				updateRow(id, {
					status: "success",
					message: outcome.path,
					path: outcome.path
				});
				onRefresh();
			} else updateRow(id, {
				status: "error",
				message: outcome.message
			});
		};
		const handleSkip = (id) => {
			updateRow(id, {
				status: "skipped",
				message: "已跳過"
			});
		};
		const totalCount = rows.length;
		const doneCount = rows.filter((r) => r.status === "success").length;
		const errorCount = rows.filter((r) => r.status === "error").length;
		const conflictCount = rows.filter((r) => r.status === "conflict").length;
		const pendingCount = rows.filter((r) => r.status === "pending").length;
		const processingRow = rows.find((r) => r.status === "processing");
		const statusIcon = (s) => {
			if (s === "processing") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin text-midground shrink-0" });
			if (s === "success") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5 text-green-400 shrink-0" });
			if (s === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleX, { className: "h-3.5 w-3.5 text-red-400 shrink-0" });
			if (s === "conflict") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TriangleAlert, { className: "h-3.5 w-3.5 text-yellow-400 shrink-0" });
			if (s === "skipped") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkipForward, { className: "h-3.5 w-3.5 text-text-tertiary shrink-0" });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "h-3.5 w-3.5 shrink-0 rounded-full border border-current/20 inline-block" });
		};
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "space-y-4",
			children: rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					className: "mb-1 block text-sm font-medium text-text-secondary",
					children: "URL 清單（每行一個）"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					value: rawText,
					onChange: (e) => setRawText(e.target.value),
					rows: 8,
					placeholder: "https://www.youtube.com/watch?v=...\nhttps://github.com/owner/repo\nhttps://example.com/article",
					className: "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent font-mono"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-xs text-text-tertiary",
					children: [
						"偵測到 ",
						parseUrls().length,
						" 個有效網址"
					]
				})
			] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: parseUrls().length === 0,
				onClick: () => void handleStart(),
				className: "rounded-md bg-midground px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50",
				children: "開始批量匯入"
			})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-4 rounded-lg border border-current/10 bg-current/[0.03] px-4 py-2 text-xs",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "text-text-secondary",
							children: [
								"共 ",
								totalCount,
								" 筆"
							]
						}),
						doneCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "text-green-400",
							children: [
								"✓ ",
								doneCount,
								" 成功"
							]
						}),
						errorCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "text-red-400",
							children: [
								"✗ ",
								errorCount,
								" 失敗"
							]
						}),
						conflictCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "text-yellow-400",
							children: [
								"⚠ ",
								conflictCount,
								" 重複待確認"
							]
						}),
						pendingCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "text-text-tertiary",
							children: [pendingCount, " 待處理"]
						}),
						processingRow && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "ml-auto text-text-tertiary truncate max-w-xs",
							children: "處理中…"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "ml-auto flex gap-2",
							children: [running && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: handleStop,
								className: "rounded px-2 py-1 text-xs border border-border text-text-secondary hover:text-red-400",
								children: "暫停"
							}), !running && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: handleReset,
								className: "rounded px-2 py-1 text-xs border border-border text-text-secondary hover:text-text-primary",
								children: "重置"
							})]
						})
					]
				}),
				running && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "h-1.5 w-full overflow-hidden rounded-full bg-current/10",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "h-full rounded-full bg-midground transition-all duration-500",
						style: { width: `${totalCount > 0 ? Math.round((doneCount + errorCount + rows.filter((r) => r.status === "skipped").length) / totalCount * 100) : 0}%` }
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "space-y-1.5 max-h-[480px] overflow-y-auto pr-1",
					children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${row.status === "conflict" ? "border-yellow-400/30 bg-yellow-400/5" : row.status === "error" ? "border-red-400/20 bg-red-400/5" : row.status === "success" ? "border-green-400/20 bg-green-400/5" : "border-current/10 bg-current/[0.02]"}`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mt-0.5",
							children: statusIcon(row.status)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "truncate text-text-secondary font-mono",
									children: row.url
								}),
								row.status === "success" && row.path && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "mt-0.5 text-green-400",
									children: row.path
								}),
								row.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "mt-0.5 text-red-400",
									children: row.message
								}),
								row.status === "conflict" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "mt-1",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "text-yellow-400",
											children: row.message
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											className: "text-text-tertiary",
											children: ["現有：", row.existingPath]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "mt-1.5 flex gap-2",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => void handleOverwrite(row.id, row.url),
												className: "rounded bg-yellow-400 px-2 py-0.5 text-[11px] font-medium text-black hover:opacity-90",
												children: "覆蓋"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => handleSkip(row.id),
												className: "rounded border border-border px-2 py-0.5 text-[11px] text-text-secondary hover:text-text-primary",
												children: "跳過"
											})]
										})
									]
								}),
								row.status === "processing" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "mt-0.5 text-text-tertiary animate-pulse",
									children: "匯入中…"
								})
							]
						})]
					}, row.id))
				})
			] })
		});
	}
	function WikiUpload({ onRefresh }) {
		const [activeTab, setActiveTab] = (0, react.useState)("import-url");
		const [url, setUrl] = (0, react.useState)("");
		const [docType, setDocType] = (0, react.useState)("auto");
		const [file, setFile] = (0, react.useState)(null);
		const [loading, setLoading] = (0, react.useState)(false);
		const [error, setError] = (0, react.useState)(null);
		const [result, setResult] = (0, react.useState)(null);
		const [conflict, setConflict] = (0, react.useState)(null);
		const [taskId, setTaskId] = (0, react.useState)(null);
		const [progress, setProgress] = (0, react.useState)(null);
		const pollRef = (0, react.useRef)(null);
		const [preflightPct, setPreflightPct] = (0, react.useState)(0);
		const preflightRef = (0, react.useRef)(null);
		const clearPreflight = (0, react.useCallback)(() => {
			if (preflightRef.current !== null) {
				clearInterval(preflightRef.current);
				preflightRef.current = null;
			}
			setPreflightPct(0);
		}, []);
		const startPreflight = (0, react.useCallback)(() => {
			clearPreflight();
			setPreflightPct(3);
			preflightRef.current = setInterval(() => setPreflightPct((p) => p < 28 ? p + 1 : p), 800);
		}, [clearPreflight]);
		const clearPoll = (0, react.useCallback)(() => {
			if (pollRef.current !== null) {
				clearInterval(pollRef.current);
				pollRef.current = null;
			}
		}, []);
		const startPolling = (0, react.useCallback)((tid) => {
			clearPoll();
			clearPreflight();
			setTaskId(tid);
			setProgress(null);
			pollRef.current = setInterval(async () => {
				try {
					const data = await wiki.analysisProgress(tid);
					setProgress(data);
					if (data.status === "complete" && data.result) {
						clearPoll();
						setResult(data.result);
						setTaskId(null);
						setProgress(null);
						setLoading(false);
						onRefresh();
					} else if (data.status === "failed") {
						clearPoll();
						setError(data.error ?? "Analysis failed");
						setTaskId(null);
						setProgress(null);
						setLoading(false);
					}
				} catch {
					clearPoll();
					setError("Progress check failed");
					setLoading(false);
				}
			}, 2e3);
		}, [
			clearPoll,
			clearPreflight,
			onRefresh
		]);
		(0, react.useEffect)(() => () => {
			clearPoll();
			clearPreflight();
		}, [clearPoll, clearPreflight]);
		const handleImportUrl = async (force = false) => {
			if (!url) return;
			setLoading(true);
			setError(null);
			setResult(null);
			setConflict(null);
			setTaskId(null);
			setProgress(null);
			clearPoll();
			startPreflight();
			try {
				const res = await wiki.importUrl({
					url,
					type: docType,
					force
				});
				if (res.status === 409) {
					clearPreflight();
					setConflict({
						...(await res.json().catch(() => ({}))).detail,
						pendingForce: "url"
					});
					setLoading(false);
					return;
				}
				if (!res.ok) {
					clearPreflight();
					const err = await res.json().catch(() => null);
					throw new Error(err?.message ?? `Import failed (${res.status})`);
				}
				const body = await res.json();
				if (body.task_id) startPolling(body.task_id);
				else {
					clearPreflight();
					setResult(body);
					setLoading(false);
					onRefresh();
				}
			} catch (e) {
				clearPreflight();
				setError(e instanceof Error ? e.message : "Failed to import URL");
				setLoading(false);
			}
		};
		const handleUploadFile = async (force = false) => {
			if (!file) return;
			setLoading(true);
			setError(null);
			setResult(null);
			setConflict(null);
			setTaskId(null);
			setProgress(null);
			clearPoll();
			startPreflight();
			try {
				const fd = new FormData();
				fd.append("file", file);
				const res = await wiki.uploadFile(fd, docType, force);
				if (res.status === 409) {
					clearPreflight();
					setConflict({
						...(await res.json().catch(() => ({}))).detail,
						pendingForce: "file"
					});
					setLoading(false);
					return;
				}
				if (!res.ok) {
					clearPreflight();
					const err = await res.json().catch(() => null);
					throw new Error(err?.message ?? `Upload failed (${res.status})`);
				}
				const body = await res.json();
				if (body.task_id) startPolling(body.task_id);
				else {
					clearPreflight();
					setResult(body);
					setLoading(false);
					onRefresh();
				}
			} catch (e) {
				clearPreflight();
				setError(e instanceof Error ? e.message : "Failed to upload file");
				setLoading(false);
			}
		};
		const handleSubmit = () => {
			if (activeTab === "import-url") handleImportUrl(false);
			else handleUploadFile(false);
		};
		const handleForceOverwrite = () => {
			if (!conflict) return;
			if (conflict.pendingForce === "url") handleImportUrl(true);
			else handleUploadFile(true);
		};
		const resetTab = () => {
			setError(null);
			setResult(null);
			setConflict(null);
			setTaskId(null);
			setProgress(null);
			clearPoll();
		};
		const tabClass = (tab) => `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? "bg-midground text-black" : "text-text-secondary hover:text-text-primary"}`;
		const activeStep = progress?.steps ? Object.entries(progress.steps).find(([, v]) => v.status === "in_progress") ?? Object.entries(progress.steps).findLast(([, v]) => v.status === "complete") ?? Object.entries(progress.steps).find(([, v]) => v.status === "failed") ?? ["", {
			status: "",
			progress: 0,
			message: ""
		}] : null;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Upload, { className: "h-5 w-5 text-text-secondary" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
					className: "text-xl font-bold text-text-primary",
					children: "Wiki Upload"
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex gap-2",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: tabClass("import-url"),
						onClick: () => {
							setActiveTab("import-url");
							resetTab();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Globe, { className: "h-4 w-4" }), "Import URL"]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: tabClass("upload-file"),
						onClick: () => {
							setActiveTab("upload-file");
							resetTab();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }), "Upload File"]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: tabClass("batch-import"),
						onClick: () => {
							setActiveTab("batch-import");
							resetTab();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(List, { className: "h-4 w-4" }), "批量匯入"]
					})
				]
			}),
			activeTab === "batch-import" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BatchImport, {
				docType,
				onRefresh
			}),
			activeTab !== "batch-import" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mb-6 space-y-4",
				children: [
					activeTab === "import-url" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: "mb-1 block text-sm font-medium text-text-secondary",
						children: "URL"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "url",
						required: true,
						value: url,
						onChange: (e) => setUrl(e.target.value),
						placeholder: "https://example.com/doc.md",
						className: "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent"
					})] }),
					activeTab === "upload-file" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: "mb-1 block text-sm font-medium text-text-secondary",
						children: "File (MD / PDF / PPT / Excel / Image)"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "file",
						accept: ".md,.markdown,.pdf,.pptx,.xlsx,.png,.jpg,.jpeg,.gif,.webp",
						onChange: (e) => setFile(e.target.files?.[0] ?? null),
						className: "w-full text-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-midground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-black hover:file:opacity-90"
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: "mb-1 block text-sm font-medium text-text-secondary",
						children: "Type"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						value: docType,
						onChange: (e) => setDocType(e.target.value),
						className: "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-accent",
						children: (activeTab === "import-url" ? DOC_TYPES : UPLOAD_TYPES).map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: t,
							children: t.charAt(0).toUpperCase() + t.slice(1)
						}, t))
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: loading || (activeTab === "import-url" ? !url : !file),
						onClick: handleSubmit,
						className: "rounded-md bg-midground px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50",
						children: loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), taskId ? "Analysing..." : activeTab === "import-url" ? "Importing..." : "Uploading..."]
						}) : activeTab === "import-url" ? "Import" : "Upload"
					})
				]
			}),
			activeTab !== "batch-import" && progress && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mb-6 rounded-lg border border-current/10 bg-current/[0.03] p-4",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChartColumn, { className: "h-5 w-5 text-midground" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "text-sm font-medium text-text-primary",
								children: "Analysis Progress"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "ml-auto text-sm text-text-secondary",
								children: [progress.progress, "%"]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProgressBar, { value: progress.progress }),
					activeStep && activeStep[0] && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "text-xs text-text-secondary",
						children: [stepLabel(activeStep[0]), activeStep[1]?.message ? ` — ${activeStep[1].message}` : ""]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mt-3 space-y-1",
						children: Object.entries(progress.steps).map(([key, val]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-xs",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `inline-block h-2 w-2 shrink-0 rounded-full ${val.status === "complete" ? "bg-green-400" : val.status === "in_progress" ? "bg-midground animate-pulse" : val.status === "failed" ? "bg-red-400" : "bg-current/20"}` }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: val.status === "complete" ? "text-text-secondary" : val.status === "in_progress" ? "text-text-primary" : "text-text-tertiary",
									children: stepLabel(key)
								}),
								val.progress > 0 && val.progress < 100 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "text-text-tertiary",
									children: [val.progress, "%"]
								})
							]
						}, key))
					})
				]
			}),
			activeTab !== "batch-import" && loading && !progress && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mb-6 rounded-lg border border-current/10 bg-current/[0.03] p-4",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin text-midground" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "text-sm font-medium text-text-primary",
								children: "Fetching content…"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "ml-auto text-sm text-text-secondary",
								children: [preflightPct, "%"]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProgressBar, { value: preflightPct }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "text-xs text-text-secondary",
						children: "Retrieving and preparing content for analysis"
					})
				]
			}),
			activeTab !== "batch-import" && conflict && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-yellow-400/40 bg-yellow-400/5 p-4",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mb-3 text-sm text-yellow-400",
						children: conflict.message
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "mb-4 text-xs text-text-secondary",
						children: ["現有檔案：", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
							className: "text-text-primary",
							children: conflict.existing_path
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: handleForceOverwrite,
							className: "rounded-md bg-yellow-400 px-3 py-1.5 text-xs font-medium text-black hover:opacity-90",
							children: "覆蓋並重新匯入"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setConflict(null),
							className: "rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary",
							children: "取消"
						})]
					})
				]
			}),
			activeTab !== "batch-import" && error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "rounded-lg border border-red-400/30 p-4",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "text-sm text-red-400",
					children: error
				})
			}),
			activeTab !== "batch-import" && result && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-green-400/30 p-4",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleCheck, { className: "h-5 w-5 text-green-400" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium text-green-400",
							children: result.message
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm text-text-secondary",
						children: ["Path: ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
							className: "text-text-primary",
							children: result.path
						})]
					}),
					result.data.languages.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-text-secondary",
						children: ["Languages: ", result.data.languages.join(", ")]
					}),
					result.data.tags.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-text-secondary",
						children: ["Tags: ", result.data.tags.join(", ")]
					}),
					result.data.category && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-text-secondary",
						children: ["Category: ", result.data.category]
					}),
					result.data.confidence && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-text-secondary",
						children: ["Confidence: ", result.data.confidence]
					})
				]
			})
		] });
	}
	//#endregion
	//#region src/pages/WikiTags.tsx
	var CATEGORY_ORDER = [
		"來源",
		"語言",
		"AI",
		"程式語言",
		"API",
		"技術",
		"格式",
		"概念",
		"主題"
	];
	var CATEGORY_COLORS = {
		"來源": "bg-blue-400/15 text-blue-300 border-blue-400/20",
		"語言": "bg-purple-400/15 text-purple-300 border-purple-400/20",
		"AI": "bg-pink-400/15 text-pink-300 border-pink-400/20",
		"程式語言": "bg-cyan-400/15 text-cyan-300 border-cyan-400/20",
		"API": "bg-orange-400/15 text-orange-300 border-orange-400/20",
		"技術": "bg-green-400/15 text-green-300 border-green-400/20",
		"格式": "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
		"概念": "bg-indigo-400/15 text-indigo-300 border-indigo-400/20",
		"主題": "bg-current/10 text-text-secondary border-current/10"
	};
	function tagColor(category) {
		return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["主題"];
	}
	function TagPill({ tag, category }) {
		const scale = Math.max(.75, Math.min(1.25, .75 + tag.count / 20 * .5));
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
			className: `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-90 ${tagColor(category)}`,
			style: { fontSize: `${Math.round(scale * 12)}px` },
			children: [tag.name, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "opacity-60 text-[10px]",
				children: tag.count
			})]
		});
	}
	function CategorySection({ name, tags, defaultOpen }) {
		const [open, setOpen] = (0, react.useState)(defaultOpen);
		const total = tags.reduce((s, t) => s + t.count, 0);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border border-current/10 overflow-hidden",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setOpen((o) => !o),
				className: "flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-current/[0.03] transition-colors",
				children: [
					open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 text-text-tertiary shrink-0" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4 text-text-tertiary shrink-0" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "text-sm font-medium text-text-primary",
						children: name
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "ml-1 rounded-full bg-current/10 px-2 py-0.5 text-[11px] text-text-tertiary",
						children: [tags.length, " 個標籤"]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "ml-auto text-xs text-text-tertiary",
						children: [total, " 次使用"]
					})
				]
			}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1.5 border-t border-current/5 bg-current/[0.015] px-4 py-3",
				children: tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TagPill, {
					tag,
					category: name
				}, tag.name))
			})]
		});
	}
	function WikiTags() {
		const [allTags, setAllTags] = (0, react.useState)([]);
		const [loading, setLoading] = (0, react.useState)(true);
		const [error, setError] = (0, react.useState)(null);
		const [search, setSearch] = (0, react.useState)("");
		function load() {
			let cancelled = false;
			setLoading(true);
			setError(null);
			wiki.allTags().then((data) => {
				if (!cancelled) {
					setAllTags(data);
					setLoading(false);
				}
			}).catch((err) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to load tags");
					setLoading(false);
				}
			});
			return () => {
				cancelled = true;
			};
		}
		(0, react.useEffect)(() => {
			return load();
		}, []);
		const { grouped, stats } = (0, react.useMemo)(() => {
			const q = search.trim().toLowerCase();
			const filtered = q ? allTags.filter((t) => t.name.toLowerCase().includes(q)) : allTags;
			const buckets = {};
			for (const tag of filtered) {
				const cat = tag.category ?? "主題";
				(buckets[cat] ??= []).push(tag);
			}
			for (const cat of Object.keys(buckets)) buckets[cat].sort((a, b) => b.count - a.count);
			const ordered = [];
			for (const name of CATEGORY_ORDER) if (buckets[name]?.length) ordered.push({
				name,
				tags: buckets[name]
			});
			for (const [name, tags] of Object.entries(buckets)) if (!CATEGORY_ORDER.includes(name)) ordered.push({
				name,
				tags
			});
			const totalUsage = allTags.reduce((s, t) => s + t.count, 0);
			return {
				grouped: ordered,
				stats: {
					unique: allTags.length,
					totalUsage,
					categories: Object.keys(buckets).length
				}
			};
		}, [allTags, search]);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tags, { className: "h-5 w-5 text-text-secondary" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
					className: "text-xl font-bold text-text-primary",
					children: "Tag Manager"
				})]
			}),
			loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-center py-16",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin text-text-tertiary" })
			}),
			error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "rounded-lg border border-red-400/20 bg-red-400/5 p-4",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "text-sm text-red-400",
					children: error
				})
			}),
			!loading && !error && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mb-6 grid grid-cols-3 gap-4",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border border-current/10 bg-current/[0.03] p-4",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "text-xs text-text-tertiary mb-1",
								children: "唯一標籤"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "text-2xl font-semibold text-text-primary",
								children: stats.unique
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border border-current/10 bg-current/[0.03] p-4",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "text-xs text-text-tertiary mb-1",
								children: "總使用次數"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "text-2xl font-semibold text-text-primary",
								children: stats.totalUsage
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border border-current/10 bg-current/[0.03] p-4",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "text-xs text-text-tertiary mb-1",
								children: "分類數"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "text-2xl font-semibold text-text-primary",
								children: stats.categories
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mb-5 relative",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "text",
							value: search,
							onChange: (e) => setSearch(e.target.value),
							placeholder: "搜尋標籤…",
							className: "w-full rounded-md border border-current/20 bg-current/5 pl-9 pr-3 py-2 text-sm text-text-primary outline-none focus:border-current/40 transition-colors"
						}),
						search && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSearch(""),
							className: "absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary text-xs",
							children: "✕"
						})
					]
				}),
				!search && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mb-4 flex flex-wrap gap-1.5",
					children: grouped.map(({ name }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tagColor(name)}`,
						children: name
					}, name))
				}),
				grouped.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "text-sm text-text-tertiary py-8 text-center",
					children: search ? `找不到包含「${search}」的標籤` : "尚無標籤"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: grouped.map(({ name, tags }, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CategorySection, {
						name,
						tags,
						defaultOpen: i < 4
					}, name))
				}),
				!search && allTags.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "mt-8",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Hash, { className: "h-4 w-4 text-text-tertiary" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: "text-sm font-semibold uppercase tracking-wide text-text-secondary",
							children: "熱門標籤"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "rounded-lg border border-current/10 bg-current/[0.03] p-4 flex flex-wrap gap-2",
						children: [...allTags].sort((a, b) => b.count - a.count).slice(0, 40).map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TagPill, {
							tag,
							category: tag.category ?? "主題"
						}, tag.name))
					})]
				})
			] })
		] });
	}
	//#endregion
	//#region src/pages/WikiGraph.tsx
	var NODE_RADIUS = 8, REPULSION = 3e3, ATTRACTION = .004, DAMPING = .85, CENTER_GRAV = .004, IDEAL_DIST = 160;
	var REPULSION_3D = 4e3, ATTRACTION_3D = .004, IDEAL_DIST_3D = 180, FOV_3D = 600, DEPTH_3D = 400;
	var TYPE_COLORS = {
		entity: "#60a5fa",
		concept: "#34d399",
		comparison: "#fbbf24"
	};
	var TYPE_COLORS_3D = {
		entity: "#7dd3fc",
		concept: "#6ee7b7",
		comparison: "#fde68a"
	};
	function forceLayout2D(nodes, edges, w, h) {
		const cx = w / 2, cy = h / 2;
		for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
			const a = nodes[i], b = nodes[j];
			const dx = b.x - a.x, dy = b.y - a.y, dist2 = dx * dx + dy * dy, dist = Math.sqrt(dist2) || 1;
			const f = REPULSION / dist2, fx = dx / dist * f, fy = dy / dist * f;
			if (!a.pinned) {
				a.vx -= fx;
				a.vy -= fy;
			}
			if (!b.pinned) {
				b.vx += fx;
				b.vy += fy;
			}
		}
		for (const e of edges) {
			const s = nodes.find((n) => n.id === e.source), t = nodes.find((n) => n.id === e.target);
			if (!s || !t) continue;
			const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
			const f = ATTRACTION * (dist - IDEAL_DIST), fx = dx / dist * f, fy = dy / dist * f;
			if (!s.pinned) {
				s.vx += fx;
				s.vy += fy;
			}
			if (!t.pinned) {
				t.vx -= fx;
				t.vy -= fy;
			}
		}
		for (const n of nodes) {
			if (n.pinned) continue;
			n.vx += (cx - n.x) * CENTER_GRAV;
			n.vy += (cy - n.y) * CENTER_GRAV;
			n.vx *= DAMPING;
			n.vy *= DAMPING;
			n.x += n.vx;
			n.y += n.vy;
			n.x = Math.max(20, Math.min(w - 20, n.x));
			n.y = Math.max(20, Math.min(h - 20, n.y));
		}
	}
	function forceLayout3D(nodes, edges) {
		for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
			const a = nodes[i], b = nodes[j];
			const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, dist2 = dx * dx + dy * dy + dz * dz, dist = Math.sqrt(dist2) || 1;
			const f = REPULSION_3D / dist2, fx = dx / dist * f, fy = dy / dist * f, fz = dz / dist * f;
			if (!a.pinned) {
				a.vx -= fx;
				a.vy -= fy;
				a.vz -= fz;
			}
			if (!b.pinned) {
				b.vx += fx;
				b.vy += fy;
				b.vz += fz;
			}
		}
		for (const e of edges) {
			const s = nodes.find((n) => n.id === e.source), t = nodes.find((n) => n.id === e.target);
			if (!s || !t) continue;
			const dx = t.x - s.x, dy = t.y - s.y, dz = t.z - s.z, dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
			const f = ATTRACTION_3D * (dist - IDEAL_DIST_3D), fx = dx / dist * f, fy = dy / dist * f, fz = dz / dist * f;
			if (!s.pinned) {
				s.vx += fx;
				s.vy += fy;
				s.vz += fz;
			}
			if (!t.pinned) {
				t.vx -= fx;
				t.vy -= fy;
				t.vz -= fz;
			}
		}
		for (const n of nodes) {
			if (n.pinned) continue;
			n.vx += -n.x * CENTER_GRAV;
			n.vy += -n.y * CENTER_GRAV;
			n.vz += -n.z * CENTER_GRAV;
			n.vx *= DAMPING;
			n.vy *= DAMPING;
			n.vz *= DAMPING;
			n.x += n.vx;
			n.y += n.vy;
			n.z += n.vz;
			const B = 400;
			n.x = Math.max(-400, Math.min(B, n.x));
			n.y = Math.max(-400, Math.min(B, n.y));
			n.z = Math.max(-400, Math.min(B, n.z));
		}
	}
	function rotatePoint(x, y, z, rx, ry) {
		const cosY = Math.cos(ry), sinY = Math.sin(ry), x1 = x * cosY + z * sinY, z1 = -x * sinY + z * cosY;
		const cosX = Math.cos(rx), sinX = Math.sin(rx);
		return [
			x1,
			y * cosX - z1 * sinX,
			y * sinX + z1 * cosX
		];
	}
	function project3D(x, y, z, w, h) {
		const s = FOV_3D / (FOV_3D + z + DEPTH_3D);
		return {
			sx: w / 2 + x * s,
			sy: h / 2 + y * s,
			s
		};
	}
	function hexAlpha(hex, alpha) {
		return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha.toFixed(2)})`;
	}
	function WikiGraph() {
		const [data, setData] = (0, react.useState)(null);
		const [loading, setLoading] = (0, react.useState)(true);
		const [error, setError] = (0, react.useState)(null);
		const [hoveredNode, setHoveredNode] = (0, react.useState)(null);
		const [mode, setMode] = (0, react.useState)("2d");
		const svgRef = (0, react.useRef)(null);
		const canvasRef = (0, react.useRef)(null);
		const containerRef = (0, react.useRef)(null);
		const layoutRef = (0, react.useRef)([]);
		const animRef = (0, react.useRef)(0);
		const [dim, setDim] = (0, react.useState)({
			w: 800,
			h: 600
		});
		const dimRef = (0, react.useRef)({
			w: 800,
			h: 600
		});
		const [scale2D, setScale2D] = (0, react.useState)(1);
		const [offset2D, setOffset2D] = (0, react.useState)({
			x: 0,
			y: 0
		});
		const scale2DRef = (0, react.useRef)(1), offset2DRef = (0, react.useRef)({
			x: 0,
			y: 0
		});
		const modeRef = (0, react.useRef)("2d"), rotRef = (0, react.useRef)({
			x: .3,
			y: 0
		});
		const scale3DRef = (0, react.useRef)(1), orbitRef = (0, react.useRef)({
			active: false,
			lastX: 0,
			lastY: 0
		});
		const hoveredRef = (0, react.useRef)(null);
		const projectedRef = (0, react.useRef)([]);
		const starsRef = (0, react.useRef)([]);
		const drag2DRef = (0, react.useRef)({
			node: null,
			ox: 0,
			oy: 0,
			svgLeft: 0,
			svgTop: 0,
			sc: 1,
			offX: 0,
			offY: 0
		});
		const drag3DRef = (0, react.useRef)({
			node: null,
			lastX: 0,
			lastY: 0,
			s: 1
		});
		const pan2DRef = (0, react.useRef)({
			active: false,
			lastX: 0,
			lastY: 0
		});
		const prevModeRef = (0, react.useRef)("2d");
		(0, react.useEffect)(() => {
			modeRef.current = mode;
		}, [mode]);
		(0, react.useEffect)(() => {
			hoveredRef.current = hoveredNode;
		}, [hoveredNode]);
		(0, react.useEffect)(() => {
			scale2DRef.current = scale2D;
		}, [scale2D]);
		(0, react.useEffect)(() => {
			offset2DRef.current = offset2D;
		}, [offset2D]);
		(0, react.useEffect)(() => {
			dimRef.current = dim;
		}, [dim]);
		const load = (0, react.useCallback)(async () => {
			setLoading(true);
			setError(null);
			try {
				setData(await wiki.graph());
			} catch (e) {
				setError(e instanceof Error ? e.message : String(e));
			} finally {
				setLoading(false);
			}
		}, []);
		(0, react.useEffect)(() => {
			load();
		}, [load]);
		(0, react.useEffect)(() => {
			if (!data) return;
			const w = containerRef.current?.clientWidth ?? 800, h = containerRef.current?.clientHeight ?? 600;
			setDim({
				w,
				h
			});
			dimRef.current = {
				w,
				h
			};
			const spread = Math.min(w, h) * .38;
			layoutRef.current = data.nodes.map((node) => ({
				...node,
				x: w / 2 + (Math.random() - .5) * spread * 2,
				y: h / 2 + (Math.random() - .5) * spread * 2,
				z: 0,
				vx: 0,
				vy: 0,
				vz: 0,
				pinned: false
			}));
		}, [data]);
		(0, react.useEffect)(() => {
			const nodes = layoutRef.current, { w, h } = dimRef.current;
			if (!nodes.length) {
				prevModeRef.current = mode;
				return;
			}
			if (mode === "3d" && prevModeRef.current === "2d") {
				const spread = Math.min(w, h) * .25;
				for (const n of nodes) {
					n.x -= w / 2;
					n.y -= h / 2;
					n.z = (Math.random() - .5) * spread;
					n.vz = 0;
				}
				rotRef.current = {
					x: .3,
					y: 0
				};
				scale3DRef.current = 1;
			} else if (mode === "2d" && prevModeRef.current === "3d") for (const n of nodes) {
				n.x += w / 2;
				n.y += h / 2;
				n.z = 0;
				n.vz = 0;
			}
			prevModeRef.current = mode;
		}, [mode]);
		(0, react.useEffect)(() => {
			const canvas = canvasRef.current, container = containerRef.current;
			if (!canvas || !container) return;
			const dpr = window.devicePixelRatio || 1, w = container.clientWidth, h = container.clientHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
		}, [mode]);
		(0, react.useEffect)(() => {
			starsRef.current = Array.from({ length: 260 }, () => ({
				x: Math.random(),
				y: Math.random(),
				r: Math.random() < .06 ? Math.random() * 1.4 + .7 : Math.random() * .7 + .15,
				a: Math.random() * .55 + .15
			}));
		}, []);
		const simulate = (0, react.useCallback)(() => {
			const nodes = layoutRef.current, edges = data?.edges ?? [];
			if (!nodes.length) {
				animRef.current = requestAnimationFrame(simulate);
				return;
			}
			const currentMode = modeRef.current, { w, h } = dimRef.current;
			for (let iter = 0; iter < 4; iter++) if (currentMode === "3d") forceLayout3D(nodes, edges);
			else forceLayout2D(nodes, edges, w, h);
			if (currentMode === "2d") {
				const svg = svgRef.current;
				if (svg) {
					const g = svg.querySelector("g[data-graph]");
					if (g) {
						const sc = scale2DRef.current, off = offset2DRef.current;
						g.setAttribute("transform", `translate(${off.x},${off.y}) scale(${sc})`);
						const nm = new Map(nodes.map((n) => [n.id, n]));
						g.querySelectorAll("circle").forEach((c) => {
							const n = nm.get(c.getAttribute("data-id") ?? "");
							if (n) {
								c.setAttribute("cx", String(n.x));
								c.setAttribute("cy", String(n.y));
							}
						});
						g.querySelectorAll("line").forEach((l) => {
							const sn = nm.get(l.getAttribute("data-source") ?? ""), tn = nm.get(l.getAttribute("data-target") ?? "");
							if (sn && tn) {
								l.setAttribute("x1", String(sn.x));
								l.setAttribute("y1", String(sn.y));
								l.setAttribute("x2", String(tn.x));
								l.setAttribute("y2", String(tn.y));
							}
						});
						g.querySelectorAll("text").forEach((t) => {
							const n = nm.get(t.getAttribute("data-id") ?? "");
							if (n) {
								t.setAttribute("x", String(n.x));
								t.setAttribute("y", String(n.y - NODE_RADIUS - 6));
							}
						});
					}
				}
			} else {
				const canvas = canvasRef.current;
				if (!canvas) {
					animRef.current = requestAnimationFrame(simulate);
					return;
				}
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					animRef.current = requestAnimationFrame(simulate);
					return;
				}
				const dpr = window.devicePixelRatio || 1, cw = canvas.width / dpr, ch = canvas.height / dpr;
				const rx = rotRef.current.x, ry = rotRef.current.y, s3d = scale3DRef.current, hov = hoveredRef.current;
				ctx.save();
				ctx.scale(dpr, dpr);
				ctx.fillStyle = "#05050e";
				ctx.fillRect(0, 0, cw, ch);
				const neb = ctx.createRadialGradient(cw * .5, ch * .5, 0, cw * .5, ch * .5, Math.min(cw, ch) * .7);
				neb.addColorStop(0, "rgba(35,15,90,0.22)");
				neb.addColorStop(.45, "rgba(10,8,45,0.12)");
				neb.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = neb;
				ctx.fillRect(0, 0, cw, ch);
				for (const star of starsRef.current) {
					ctx.beginPath();
					ctx.arc(star.x * cw, star.y * ch, star.r, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(255,255,255,${star.a.toFixed(2)})`;
					ctx.fill();
				}
				const projected = nodes.map((n) => {
					const [rx2, ry2, rz] = rotatePoint(n.x * s3d, n.y * s3d, n.z * s3d, rx, ry);
					const { sx, sy, s } = project3D(rx2, ry2, rz, cw, ch);
					return {
						id: n.id,
						title: n.title,
						type: n.type,
						sx,
						sy,
						s,
						rz
					};
				});
				projectedRef.current = projected.map(({ id, sx, sy, s }) => ({
					id,
					sx,
					sy,
					s
				}));
				const sorted = [...projected].sort((a, b) => a.rz - b.rz);
				for (const e of edges) {
					const sn = projected.find((p) => p.id === e.source), tn = projected.find((p) => p.id === e.target);
					if (!sn || !tn) continue;
					const isHL = hov === e.source || hov === e.target;
					const grad = ctx.createLinearGradient(sn.sx, sn.sy, tn.sx, tn.sy);
					grad.addColorStop(0, isHL ? "rgba(130,180,255,0.35)" : "rgba(80,120,200,0.06)");
					grad.addColorStop(.5, isHL ? "rgba(150,200,255,0.55)" : "rgba(100,150,220,0.13)");
					grad.addColorStop(1, isHL ? "rgba(130,180,255,0.35)" : "rgba(80,120,200,0.06)");
					ctx.beginPath();
					ctx.moveTo(sn.sx, sn.sy);
					ctx.lineTo(tn.sx, tn.sy);
					ctx.strokeStyle = grad;
					ctx.lineWidth = isHL ? 1.3 : .7;
					ctx.stroke();
				}
				for (const n of sorted) {
					const color = TYPE_COLORS_3D[n.type] ?? "#7dd3fc", r = Math.max(4, NODE_RADIUS * n.s * 2.6), isHov = n.id === hov, depth = Math.max(.1, Math.min(1, n.s * 2.6));
					const coronaR = r * (isHov ? 5.5 : 4), corona = ctx.createRadialGradient(n.sx, n.sy, r * .4, n.sx, n.sy, coronaR);
					corona.addColorStop(0, hexAlpha(color, (isHov ? .38 : .16) * depth));
					corona.addColorStop(1, hexAlpha(color, 0));
					ctx.beginPath();
					ctx.arc(n.sx, n.sy, coronaR, 0, Math.PI * 2);
					ctx.fillStyle = corona;
					ctx.fill();
					const body = ctx.createRadialGradient(n.sx - r * .32, n.sy - r * .32, 0, n.sx, n.sy, r);
					body.addColorStop(0, hexAlpha(color, isHov ? 1 : Math.min(1, depth * 1.3)));
					body.addColorStop(.55, hexAlpha(color, (isHov ? .82 : .65) * depth));
					body.addColorStop(1, hexAlpha(color, (isHov ? .22 : .08) * depth));
					ctx.beginPath();
					ctx.arc(n.sx, n.sy, r, 0, Math.PI * 2);
					ctx.fillStyle = body;
					ctx.fill();
					const cR = r * .32, core = ctx.createRadialGradient(n.sx - cR * .5, n.sy - cR * .5, 0, n.sx, n.sy, cR);
					core.addColorStop(0, `rgba(255,255,255,${((isHov ? .98 : .72) * depth).toFixed(2)})`);
					core.addColorStop(1, "rgba(255,255,255,0)");
					ctx.beginPath();
					ctx.arc(n.sx, n.sy, cR, 0, Math.PI * 2);
					ctx.fillStyle = core;
					ctx.fill();
					const label = n.title.length > 20 ? n.title.slice(0, 20) + "…" : n.title, fontSize = Math.max(8, Math.round(Math.min(12, 8 + depth * 5))), labelA = isHov ? .97 : Math.max(.25, .3 + depth * .65);
					ctx.font = `${fontSize}px system-ui,sans-serif`;
					ctx.textAlign = "center";
					ctx.shadowColor = hexAlpha(color, isHov ? .85 : .55 * depth);
					ctx.shadowBlur = isHov ? 10 : 5;
					ctx.fillStyle = isHov ? "rgba(220,240,255,0.97)" : `rgba(190,220,255,${labelA.toFixed(2)})`;
					ctx.fillText(label, n.sx, n.sy - r - 4);
					ctx.shadowBlur = 0;
					ctx.shadowColor = "transparent";
				}
				{
					const ax = cw - 44, ay = ch - 44;
					for (const [x, y, z, col] of [
						[
							18,
							0,
							0,
							"#f87171"
						],
						[
							0,
							-18,
							0,
							"#4ade80"
						],
						[
							0,
							0,
							18,
							"#60a5fa"
						]
					]) {
						const [rx2, ry2] = rotatePoint(x, y, z, rx, ry), { sx: ex, sy: ey } = project3D(rx2 * .5, ry2 * .5, 0, 0, 0);
						ctx.shadowColor = col;
						ctx.shadowBlur = 5;
						ctx.beginPath();
						ctx.moveTo(ax, ay);
						ctx.lineTo(ax + ex, ay + ey);
						ctx.strokeStyle = col;
						ctx.lineWidth = 1.5;
						ctx.stroke();
					}
					ctx.shadowBlur = 0;
					ctx.shadowColor = "transparent";
				}
				ctx.restore();
			}
			animRef.current = requestAnimationFrame(simulate);
		}, [data]);
		(0, react.useEffect)(() => {
			if (!data) return;
			animRef.current = requestAnimationFrame(simulate);
			return () => cancelAnimationFrame(animRef.current);
		}, [data, simulate]);
		(0, react.useEffect)(() => {
			const container = containerRef.current;
			if (!container) return;
			const ro = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const w = entry.contentRect.width, h = entry.contentRect.height;
					setDim({
						w,
						h
					});
					dimRef.current = {
						w,
						h
					};
					const canvas = canvasRef.current;
					if (canvas) {
						const dpr = window.devicePixelRatio || 1;
						canvas.width = w * dpr;
						canvas.height = h * dpr;
						canvas.style.width = `${w}px`;
						canvas.style.height = `${h}px`;
					}
				}
			});
			ro.observe(container);
			return () => ro.disconnect();
		}, []);
		const handleMouseDown2D = (0, react.useCallback)((nodeId, e) => {
			const node = layoutRef.current.find((n) => n.id === nodeId), svg = svgRef.current;
			if (!node || !svg) return;
			e.stopPropagation();
			node.pinned = true;
			const rect = svg.getBoundingClientRect(), sc = scale2DRef.current, offX = offset2DRef.current.x, offY = offset2DRef.current.y;
			drag2DRef.current = {
				node,
				ox: e.clientX - (rect.left + offX + node.x * sc),
				oy: e.clientY - (rect.top + offY + node.y * sc),
				svgLeft: rect.left,
				svgTop: rect.top,
				sc,
				offX,
				offY
			};
			const onMove = (ev) => {
				const d = drag2DRef.current;
				if (!d.node) return;
				d.node.x = (ev.clientX - d.ox - d.svgLeft - d.offX) / d.sc;
				d.node.y = (ev.clientY - d.oy - d.svgTop - d.offY) / d.sc;
			};
			const onUp = () => {
				const d = drag2DRef.current;
				if (d.node) {
					d.node.pinned = false;
					d.node.vx = 0;
					d.node.vy = 0;
				}
				drag2DRef.current.node = null;
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		}, []);
		const handleSVGMouseDown = (0, react.useCallback)((e) => {
			const tag = e.target.tagName.toLowerCase();
			if (tag === "circle" || tag === "text") return;
			pan2DRef.current = {
				active: true,
				lastX: e.clientX,
				lastY: e.clientY
			};
		}, []);
		const handleSVGMouseMove = (0, react.useCallback)((e) => {
			if (!pan2DRef.current.active) return;
			const dx = e.clientX - pan2DRef.current.lastX, dy = e.clientY - pan2DRef.current.lastY;
			pan2DRef.current.lastX = e.clientX;
			pan2DRef.current.lastY = e.clientY;
			const next = {
				x: offset2DRef.current.x + dx,
				y: offset2DRef.current.y + dy
			};
			offset2DRef.current = next;
			setOffset2D(next);
		}, []);
		const handleSVGMouseUp = (0, react.useCallback)(() => {
			pan2DRef.current.active = false;
		}, []);
		const hitTest3D = (0, react.useCallback)((mx, my) => projectedRef.current.find(({ sx, sy, s }) => {
			const dx = mx - sx, dy = my - sy;
			return Math.sqrt(dx * dx + dy * dy) < Math.max(6, NODE_RADIUS * s * 2.5) + 5;
		}), []);
		const handle3DMouseDown = (0, react.useCallback)((e) => {
			const rect = canvasRef.current.getBoundingClientRect(), hit = hitTest3D(e.clientX - rect.left, e.clientY - rect.top);
			if (hit) {
				const node = layoutRef.current.find((n) => n.id === hit.id);
				if (node) {
					node.pinned = true;
					drag3DRef.current = {
						node,
						lastX: e.clientX,
						lastY: e.clientY,
						s: hit.s
					};
				}
			} else orbitRef.current = {
				active: true,
				lastX: e.clientX,
				lastY: e.clientY
			};
		}, [hitTest3D]);
		const handle3DMouseMove = (0, react.useCallback)((e) => {
			const rect = canvasRef.current.getBoundingClientRect(), hit = hitTest3D(e.clientX - rect.left, e.clientY - rect.top);
			setHoveredNode(hit ? hit.id : null);
			const d = drag3DRef.current;
			if (d.node) {
				const dsx = e.clientX - d.lastX, dsy = e.clientY - d.lastY;
				d.lastX = e.clientX;
				d.lastY = e.clientY;
				const [wx, wy, wz] = rotatePoint(dsx / (d.s * scale3DRef.current), dsy / (d.s * scale3DRef.current), 0, -rotRef.current.x, -rotRef.current.y);
				d.node.x += wx;
				d.node.y += wy;
				d.node.z += wz;
				return;
			}
			if (orbitRef.current.active) {
				rotRef.current.y += (e.clientX - orbitRef.current.lastX) * .005;
				rotRef.current.x += (e.clientY - orbitRef.current.lastY) * .005;
				orbitRef.current.lastX = e.clientX;
				orbitRef.current.lastY = e.clientY;
			}
		}, [hitTest3D]);
		const handle3DMouseUp = (0, react.useCallback)(() => {
			const d = drag3DRef.current;
			if (d.node) {
				d.node.pinned = false;
				d.node.vx = 0;
				d.node.vy = 0;
				d.node.vz = 0;
				d.node = null;
			}
			orbitRef.current.active = false;
		}, []);
		const handle3DWheel = (0, react.useCallback)((e) => {
			e.preventDefault();
			scale3DRef.current = Math.max(.3, Math.min(3, scale3DRef.current - e.deltaY * .001));
		}, []);
		const applyZoom2D = (0, react.useCallback)((mx, my, delta) => {
			const oldScale = scale2DRef.current, newScale = Math.max(.3, Math.min(3, oldScale + delta));
			if (newScale === oldScale) return;
			const ratio = newScale / oldScale, newOffset = {
				x: mx - (mx - offset2DRef.current.x) * ratio,
				y: my - (my - offset2DRef.current.y) * ratio
			};
			scale2DRef.current = newScale;
			offset2DRef.current = newOffset;
			setScale2D(newScale);
			setOffset2D(newOffset);
		}, []);
		const headerBar = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Share2, { className: "h-5 w-5 text-text-secondary" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
						className: "text-lg font-semibold",
						children: "Wiki Graph"
					}),
					data && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "text-xs text-text-tertiary",
						children: [
							data.nodes.length,
							" nodes · ",
							data.edges.length,
							" edges"
						]
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						onClick: () => void load(),
						className: "rounded p-1.5 text-text-tertiary hover:text-text-secondary transition-colors mr-1",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshCw, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "flex rounded border border-current/20 overflow-hidden mr-2",
						children: ["2d", "3d"].map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => setMode(m),
							className: `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${mode === m ? "bg-midground/30 text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`,
							children: [
								m === "2d" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Square, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Box, { className: "h-3.5 w-3.5" }),
								" ",
								m.toUpperCase()
							]
						}, m))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						title: "Zoom in",
						className: "rounded bg-current/10 p-1.5 hover:bg-current/20",
						onClick: () => {
							if (mode === "2d") {
								const { w, h } = dimRef.current;
								applyZoom2D(w / 2, h / 2, .2);
							} else scale3DRef.current = Math.min(scale3DRef.current + .2, 3);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZoomIn, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						title: "Zoom out",
						className: "rounded bg-current/10 p-1.5 hover:bg-current/20",
						onClick: () => {
							if (mode === "2d") {
								const { w, h } = dimRef.current;
								applyZoom2D(w / 2, h / 2, -.2);
							} else scale3DRef.current = Math.max(scale3DRef.current - .2, .3);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZoomOut, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						title: "Reset",
						className: "rounded bg-current/10 p-1.5 hover:bg-current/20",
						onClick: () => {
							if (mode === "2d") {
								const z = {
									x: 0,
									y: 0
								};
								setOffset2D(z);
								offset2DRef.current = z;
								setScale2D(1);
								scale2DRef.current = 1;
							} else {
								rotRef.current = {
									x: .3,
									y: 0
								};
								scale3DRef.current = 1;
							}
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RotateCw, { className: "h-4 w-4" })
					})
				]
			})]
		});
		if (loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [headerBar, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-center py-16",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin text-text-tertiary" })
		})] });
		if (error) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [headerBar, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "rounded-lg border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-400",
			children: error
		})] });
		const graphNodes = layoutRef.current;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex flex-col",
			style: { minHeight: 500 },
			children: [
				headerBar,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mb-3 flex flex-wrap gap-4 text-xs text-text-secondary",
					children: Object.entries(TYPE_COLORS).map(([type, color]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "inline-block h-2.5 w-2.5 rounded-full",
							style: { backgroundColor: color }
						}), type.charAt(0).toUpperCase() + type.slice(1)]
					}, type))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: containerRef,
					className: `relative flex-1 overflow-hidden rounded-lg border ${mode === "3d" ? "border-white/5 bg-[#05050e]" : "border-current/10 bg-current/[0.02]"}`,
					style: { height: 480 },
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
							ref: svgRef,
							width: "100%",
							height: "100%",
							className: "select-none",
							style: { display: mode === "2d" ? "block" : "none" },
							onMouseDown: handleSVGMouseDown,
							onMouseMove: handleSVGMouseMove,
							onMouseUp: handleSVGMouseUp,
							onMouseLeave: handleSVGMouseUp,
							onWheel: (e) => {
								e.preventDefault();
								const rect = svgRef.current.getBoundingClientRect();
								applyZoom2D(e.clientX - rect.left, e.clientY - rect.top, -e.deltaY * .001);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
								"data-graph": true,
								transform: `translate(${offset2D.x},${offset2D.y}) scale(${scale2D})`,
								children: [data?.edges.map((edge, i) => {
									const nm = new Map(graphNodes.map((n) => [n.id, n])), src = nm.get(edge.source), tgt = nm.get(edge.target), hl = hoveredNode === edge.source || hoveredNode === edge.target;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
										"data-source": edge.source,
										"data-target": edge.target,
										x1: src?.x ?? 0,
										y1: src?.y ?? 0,
										x2: tgt?.x ?? 0,
										y2: tgt?.y ?? 0,
										stroke: hl ? "#ffffff" : "currentColor",
										strokeOpacity: hl ? .6 : .15,
										strokeWidth: hl ? 2 : 1
									}, `e-${i}`);
								}), graphNodes.map((node) => {
									const isHov = hoveredNode === node.id, color = TYPE_COLORS[node.type] ?? "#888";
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
										"data-id": node.id,
										cx: node.x,
										cy: node.y,
										r: isHov ? 11 : NODE_RADIUS,
										fill: color,
										fillOpacity: isHov ? 1 : .75,
										stroke: isHov ? "#fff" : "none",
										strokeWidth: 2,
										style: { cursor: "grab" },
										onMouseEnter: () => setHoveredNode(node.id),
										onMouseLeave: () => setHoveredNode(null),
										onMouseDown: (e) => handleMouseDown2D(node.id, e)
									}), isHov && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										"data-id": node.id,
										x: node.x,
										y: node.y - NODE_RADIUS - 6,
										textAnchor: "middle",
										fill: "currentColor",
										fontSize: 11,
										className: "pointer-events-none",
										children: node.title.length > 26 ? node.title.slice(0, 26) + "…" : node.title
									})] }, node.id);
								})]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
							ref: canvasRef,
							className: "select-none",
							style: {
								display: mode === "3d" ? "block" : "none",
								width: "100%",
								height: "100%"
							},
							onMouseDown: handle3DMouseDown,
							onMouseMove: handle3DMouseMove,
							onMouseUp: handle3DMouseUp,
							onMouseLeave: handle3DMouseUp,
							onWheel: handle3DWheel
						}),
						!graphNodes.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "absolute inset-0 flex items-center justify-center",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "text-sm text-text-tertiary",
								children: "No graph data available."
							})
						})
					]
				})
			]
		});
	}
	//#endregion
	//#region src/pages/WikiGitHub.tsx
	var STATUS_LABELS = {
		added: "新增",
		modified: "修改",
		deleted: "刪除",
		untracked: "新增",
		renamed: "重新命名"
	};
	var STATUS_COLORS = {
		added: "text-green-400",
		modified: "text-yellow-400",
		deleted: "text-red-400",
		untracked: "text-green-400",
		renamed: "text-blue-400"
	};
	function Badge({ status }) {
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
			className: `text-xs font-mono ${STATUS_COLORS[status] ?? "text-text-tertiary"}`,
			children: [
				"[",
				STATUS_LABELS[status] ?? status,
				"]"
			]
		});
	}
	function WikiGitHub() {
		const [status, setStatus] = (0, react.useState)(null);
		const [loading, setLoading] = (0, react.useState)(true);
		const [actionLoading, setActionLoading] = (0, react.useState)(null);
		const [message, setMessage] = (0, react.useState)(null);
		const [repoUrl, setRepoUrl] = (0, react.useState)("");
		const [pat, setPat] = (0, react.useState)("");
		const [branch, setBranch] = (0, react.useState)("main");
		const [autoSync, setAutoSync] = (0, react.useState)("off");
		const [showPat, setShowPat] = (0, react.useState)(false);
		const [commitMsg, setCommitMsg] = (0, react.useState)("");
		const [settingsOpen, setSettingsOpen] = (0, react.useState)(false);
		const fetchStatus = (0, react.useCallback)(async () => {
			try {
				const data = await github.status();
				setStatus(data);
				if (!repoUrl && data.repo_url) setRepoUrl(data.repo_url);
				if (!branch && data.branch) setBranch(data.branch);
				if (data.auto_sync) setAutoSync(data.auto_sync);
				if (!data.configured) setSettingsOpen(true);
			} catch (e) {
				setMessage({
					type: "error",
					text: String(e)
				});
			} finally {
				setLoading(false);
			}
		}, []);
		(0, react.useEffect)(() => {
			fetchStatus();
		}, [fetchStatus]);
		const showMsg = (type, text) => {
			setMessage({
				type,
				text
			});
			setTimeout(() => setMessage(null), 5e3);
		};
		const handleSaveConfig = async () => {
			setActionLoading("save");
			try {
				showMsg("success", (await github.saveConfig({
					repo_url: repoUrl,
					pat,
					branch,
					auto_sync: autoSync
				})).message ?? "設定已儲存");
				setSettingsOpen(false);
				await fetchStatus();
			} catch (e) {
				showMsg("error", String(e));
			} finally {
				setActionLoading(null);
			}
		};
		const handlePush = async () => {
			setActionLoading("push");
			try {
				showMsg("success", (await github.push({ message: commitMsg })).message ?? "上傳成功");
				setCommitMsg("");
				await fetchStatus();
			} catch (e) {
				showMsg("error", String(e));
			} finally {
				setActionLoading(null);
			}
		};
		const handlePull = async () => {
			if (!confirm("確定要從 GitHub 還原嗎？本機的未提交變更將會被覆蓋。")) return;
			setActionLoading("pull");
			try {
				showMsg("success", (await github.pull()).message ?? "還原成功");
				await fetchStatus();
			} catch (e) {
				showMsg("error", String(e));
			} finally {
				setActionLoading(null);
			}
		};
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "space-y-6 pb-8",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Github, { className: "h-5 w-5 text-text-secondary" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
							className: "text-lg font-semibold",
							children: "GitHub 同步"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => void fetchStatus(),
							className: "flex items-center gap-1 rounded px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5" }), "重新整理"]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => setSettingsOpen((v) => !v),
							className: "flex items-center gap-1 rounded px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors border border-current/10",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Settings, { className: "h-3.5 w-3.5" }), "設定"]
						})]
					})]
				}),
				message && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `flex items-start gap-2 rounded-md p-3 text-sm ${message.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`,
					children: [message.type === "success" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 shrink-0 mt-0.5" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleAlert, { className: "h-4 w-4 shrink-0 mt-0.5" }), message.text]
				}),
				settingsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-current/10 bg-current/5 p-4 space-y-4",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium text-text-secondary",
							children: "GitHub 設定"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "grid gap-3",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									className: "block text-xs text-text-tertiary mb-1",
									children: "Repository URL"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "url",
									value: repoUrl,
									onChange: (e) => setRepoUrl(e.target.value),
									placeholder: "https://github.com/your-username/your-wiki",
									className: "w-full rounded border border-current/20 bg-current/5 px-3 py-2 text-sm outline-none focus:border-current/40 transition-colors"
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "block text-xs text-text-tertiary mb-1",
										children: "Personal Access Token (PAT)"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "relative",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: showPat ? "text" : "password",
											value: pat,
											onChange: (e) => setPat(e.target.value),
											placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
											className: "w-full rounded border border-current/20 bg-current/5 px-3 py-2 pr-9 text-sm outline-none focus:border-current/40 transition-colors"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setShowPat((v) => !v),
											className: "absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary",
											children: showPat ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs text-text-tertiary",
										children: [
											"在 GitHub → Settings → Developer settings → Personal access tokens 產生，需勾選 ",
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "repo" }),
											" 權限"
										]
									})
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "block text-xs text-text-tertiary mb-1",
										children: "分支"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										value: branch,
										onChange: (e) => setBranch(e.target.value),
										placeholder: "main",
										className: "w-full rounded border border-current/20 bg-current/5 px-3 py-2 text-sm outline-none focus:border-current/40 transition-colors"
									})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: "block text-xs text-text-tertiary mb-1",
										children: "自動同步"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										value: autoSync,
										onChange: (e) => setAutoSync(e.target.value),
										className: "w-full rounded border border-current/20 bg-current/5 px-3 py-2 text-sm outline-none focus:border-current/40 transition-colors",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "off",
											children: "關閉"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "hourly",
											children: "每小時自動上傳"
										})]
									})] })]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "flex justify-end gap-2 pt-1",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: () => setSettingsOpen(false),
								className: "rounded px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors",
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								onClick: () => void handleSaveConfig(),
								disabled: actionLoading === "save",
								className: "flex items-center gap-1.5 rounded bg-midground/20 px-3 py-1.5 text-sm hover:bg-midground/30 disabled:opacity-50 transition-colors",
								children: [actionLoading === "save" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5" }), "儲存設定"]
							})]
						})
					]
				}),
				loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-center py-12",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin text-text-tertiary" })
				}) : !status?.configured ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-current/10 p-8 text-center space-y-2",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Github, { className: "h-10 w-10 mx-auto text-text-tertiary/40" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "text-sm text-text-secondary",
							children: "尚未設定 GitHub 同步"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "text-xs text-text-tertiary",
							children: "請點選右上角「設定」填入 Repository URL 和 PAT"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border border-current/10 bg-current/5 p-4",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-sm",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-text-secondary",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Github, { className: "h-4 w-4" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "font-mono text-xs",
											children: status.repo_url
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "text-text-tertiary",
											children: ["/", status.branch]
										})
									]
								}), status.auto_sync === "hourly" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1 text-xs text-text-tertiary",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Clock, { className: "h-3.5 w-3.5" }), "每小時自動同步"]
								})]
							}), status.last_commit && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "mt-1.5 text-xs text-text-tertiary",
								children: ["上次提交：", status.last_commit]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border border-current/10 bg-current/5",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "border-b border-current/10 px-4 py-2.5 flex items-center justify-between",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium",
									children: "本機變更"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "text-xs text-text-tertiary",
									children: status.changes.length > 0 ? `${status.changes.length} 個檔案待上傳` : "已是最新版本"
								})]
							}), status.changes.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "px-4 py-6 text-center",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CircleCheck, { className: "h-6 w-6 mx-auto text-green-400/60 mb-1.5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "text-sm text-text-tertiary",
									children: "沒有待上傳的變更"
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: "divide-y divide-current/5 max-h-60 overflow-y-auto",
								children: status.changes.map((change, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: "flex items-center gap-2 px-4 py-2 text-sm",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, { status: change.status }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "font-mono text-xs text-text-secondary truncate",
										children: change.path
									})]
								}, i))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: "block text-xs text-text-tertiary mb-1",
							children: "提交訊息（選填）"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "text",
							value: commitMsg,
							onChange: (e) => setCommitMsg(e.target.value),
							placeholder: `Hermes sync ${(/* @__PURE__ */ new Date()).toLocaleString("zh-TW")}`,
							className: "w-full rounded border border-current/20 bg-current/5 px-3 py-2 text-sm outline-none focus:border-current/40 transition-colors"
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "flex gap-3",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								onClick: () => void handlePush(),
								disabled: actionLoading !== null || status.changes.length === 0,
								className: "flex flex-1 items-center justify-center gap-2 rounded-lg border border-current/20 bg-current/5 px-4 py-3 text-sm font-medium hover:bg-current/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
								children: [actionLoading === "push" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Upload, { className: "h-4 w-4" }), "上傳到 GitHub"]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								onClick: () => void handlePull(),
								disabled: actionLoading !== null,
								className: "flex flex-1 items-center justify-center gap-2 rounded-lg border border-current/20 bg-current/5 px-4 py-3 text-sm font-medium hover:bg-current/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
								children: [actionLoading === "pull" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), "從 GitHub 還原"]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "text-xs text-text-tertiary text-center",
							children: "還原時以 GitHub 為準，本機未上傳的變更將被覆蓋"
						})
					]
				})
			]
		});
	}
	//#endregion
	//#region src/App.tsx
	var TABS = [
		{
			id: "overview",
			label: "Overview",
			Icon: BookOpen
		},
		{
			id: "pages",
			label: "Pages",
			Icon: FileText
		},
		{
			id: "upload",
			label: "Upload",
			Icon: Upload
		},
		{
			id: "tags",
			label: "Tags",
			Icon: Tags
		},
		{
			id: "graph",
			label: "Graph",
			Icon: Share2
		},
		{
			id: "github",
			label: "GitHub",
			Icon: Github
		}
	];
	function getInitialTab() {
		const hash = window.location.hash.replace("#wiki/", "");
		if (TABS.some((t) => t.id === hash)) return hash;
		return "overview";
	}
	function App() {
		const [tab, setTab] = (0, react.useState)(getInitialTab);
		const [refreshKey, setRefreshKey] = (0, react.useState)(0);
		const refresh = () => setRefreshKey((k) => k + 1);
		function navigate(t) {
			setTab(t);
			window.location.hash = `wiki/${t}`;
		}
		(0, react.useEffect)(() => {
			const onHash = () => {
				const hash = window.location.hash.replace("#wiki/", "");
				if (TABS.some((t) => t.id === hash)) setTab(hash);
			};
			window.addEventListener("hashchange", onHash);
			return () => window.removeEventListener("hashchange", onHash);
		}, []);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-5xl space-y-0 pb-8",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
				className: "mb-6 flex gap-1 border-b border-current/10",
				children: TABS.map(({ id, label, Icon }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					onClick: () => navigate(id),
					className: `flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${tab === id ? "border-text-primary text-text-primary" : "border-transparent text-text-tertiary hover:text-text-secondary"}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), label]
				}, id))
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				tab === "overview" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiOverview, { onNavigate: navigate }),
				tab === "pages" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiPageList, {
					onNavigate: navigate,
					onRefresh: refresh
				}),
				tab === "upload" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiUpload, { onRefresh: refresh }),
				tab === "tags" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiTags, {}),
				tab === "graph" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiGraph, {}),
				tab === "github" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiGitHub, {})
			] }, refreshKey)]
		});
	}
	//#endregion
	//#region src/index.tsx
	if (window.__HERMES_PLUGINS__ && typeof window.__HERMES_PLUGINS__.register === "function") window.__HERMES_PLUGINS__.register("llm-wiki", App);
	//#endregion
})(__sdk_react, __sdk_jsx);
