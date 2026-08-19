import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, ServerRouter, UNSAFE_withComponentProps, UNSAFE_withErrorBoundaryProps, isRouteErrorResponse } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { jsx, jsxs } from "react/jsx-runtime";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region node_modules/@react-router/dev/dist/config/defaults/entry.server.node.tsx
var entry_server_node_exports = /* @__PURE__ */ __exportAll({
	default: () => handleRequest,
	streamTimeout: () => streamTimeout
});
var streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
	if (request.method.toUpperCase() === "HEAD") return new Response(null, {
		status: responseStatusCode,
		headers: responseHeaders
	});
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		let userAgent = request.headers.get("user-agent");
		let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
		let timeoutId = setTimeout(() => abort(), 6e3);
		const { pipe, abort } = renderToPipeableStream(/* @__PURE__ */ jsx(ServerRouter, {
			context: routerContext,
			url: request.url
		}), {
			[readyOption]() {
				shellRendered = true;
				const body = new PassThrough({ final(callback) {
					clearTimeout(timeoutId);
					timeoutId = void 0;
					callback();
				} });
				const stream = createReadableStreamFromReadable(body);
				responseHeaders.set("Content-Type", "text/html");
				pipe(body);
				resolve(new Response(stream, {
					headers: responseHeaders,
					status: responseStatusCode
				}));
			},
			onShellError(error) {
				reject(error);
			},
			onError(error) {
				responseStatusCode = 500;
				if (shellRendered) console.error(error);
			}
		});
	});
}
//#endregion
//#region app/root.tsx
var root_exports = /* @__PURE__ */ __exportAll({
	ErrorBoundary: () => ErrorBoundary,
	Layout: () => Layout,
	default: () => root_default,
	links: () => links
});
var links = () => [
	{
		rel: "preconnect",
		href: "https://fonts.googleapis.com"
	},
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous"
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
	}
];
function Layout({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsxs("head", { children: [
			/* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
			/* @__PURE__ */ jsx("meta", {
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			}),
			/* @__PURE__ */ jsx(Meta, {}),
			/* @__PURE__ */ jsx(Links, {})
		] }), /* @__PURE__ */ jsxs("body", { children: [
			children,
			/* @__PURE__ */ jsx(ScrollRestoration, {}),
			/* @__PURE__ */ jsx(Scripts, {})
		] })]
	});
}
var queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
var root_default = UNSAFE_withComponentProps(function App() {
	return /* @__PURE__ */ jsx(StrictMode, { children: /* @__PURE__ */ jsx(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ jsx(Outlet, {})
	}) });
});
var ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary({ error }) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack;
	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "pt-16 p-4 container mx-auto",
		children: [
			/* @__PURE__ */ jsx("h1", { children: message }),
			/* @__PURE__ */ jsx("p", { children: details }),
			stack
		]
	});
});
//#endregion
//#region \0virtual:react-router/server-manifest
var server_manifest_default = {
	"entry": {
		"module": "/assets/entry.client-Cf1RC_rJ.js",
		"imports": [
			"/assets/utils-BJ0Opo7w.js",
			"/assets/react-dom-CA8SrFs2.js",
			"/assets/components-CQVDKtAm.js",
			"/assets/errorBoundaries-CA17x6Co.js",
			"/assets/jsx-runtime-w3lC_jDG.js"
		],
		"css": []
	},
	"routes": {
		"root": {
			"id": "root",
			"parentId": void 0,
			"path": "",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": true,
			"module": "/assets/root-DH4SezZH.js",
			"imports": [
				"/assets/utils-BJ0Opo7w.js",
				"/assets/react-dom-CA8SrFs2.js",
				"/assets/components-CQVDKtAm.js",
				"/assets/errorBoundaries-CA17x6Co.js",
				"/assets/jsx-runtime-w3lC_jDG.js",
				"/assets/lib-Bxn1tU8O.js",
				"/assets/QueryClientProvider-BJlli0Rn.js"
			],
			"css": ["/assets/root-b86B-t2s.css"],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"layouts/AppLayout": {
			"id": "layouts/AppLayout",
			"parentId": "root",
			"path": void 0,
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/AppLayout-BgUVn04g.js",
			"imports": [
				"/assets/utils-BJ0Opo7w.js",
				"/assets/react-dom-CA8SrFs2.js",
				"/assets/components-CQVDKtAm.js",
				"/assets/lib-Bxn1tU8O.js",
				"/assets/jsx-runtime-w3lC_jDG.js",
				"/assets/createBaseUIEventDetails-_oks1XcZ.js",
				"/assets/users-D6vVB5XP.js",
				"/assets/sheet-JaYLkzMv.js",
				"/assets/input-FC_0Rp_H.js",
				"/assets/usePositioner-C7poZQNq.js",
				"/assets/errorBoundaries-CA17x6Co.js",
				"/assets/x-C3EdBO8Z.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/home": {
			"id": "routes/home",
			"parentId": "layouts/AppLayout",
			"path": void 0,
			"index": true,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/home-main-DyRMsa8p.js",
			"imports": ["/assets/components-CQVDKtAm.js", "/assets/utils-BJ0Opo7w.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/home-client-loader-OWxrOo4G.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/roster/route": {
			"id": "routes/roster/route",
			"parentId": "layouts/AppLayout",
			"path": "roster",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/route-Do48zWD_.js",
			"imports": [
				"/assets/utils-BJ0Opo7w.js",
				"/assets/react-dom-CA8SrFs2.js",
				"/assets/components-CQVDKtAm.js",
				"/assets/jsx-runtime-w3lC_jDG.js",
				"/assets/QueryClientProvider-BJlli0Rn.js",
				"/assets/useMutation-BNQvl929.js",
				"/assets/createBaseUIEventDetails-_oks1XcZ.js",
				"/assets/dropdown-menu-v6yUuX1x.js",
				"/assets/x-C3EdBO8Z.js",
				"/assets/sheet-JaYLkzMv.js",
				"/assets/input-FC_0Rp_H.js",
				"/assets/usePositioner-C7poZQNq.js",
				"/assets/venue-context-CVnq5NG0.js",
				"/assets/textarea-B1i_LdLi.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/staff/route": {
			"id": "routes/staff/route",
			"parentId": "layouts/AppLayout",
			"path": "staff",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/route-DUD7vrGr.js",
			"imports": [
				"/assets/components-CQVDKtAm.js",
				"/assets/jsx-runtime-w3lC_jDG.js",
				"/assets/createBaseUIEventDetails-_oks1XcZ.js",
				"/assets/dropdown-menu-v6yUuX1x.js",
				"/assets/users-D6vVB5XP.js",
				"/assets/venue-context-CVnq5NG0.js",
				"/assets/hooks-DdWDv3v9.js",
				"/assets/utils-BJ0Opo7w.js",
				"/assets/react-dom-CA8SrFs2.js",
				"/assets/usePositioner-C7poZQNq.js",
				"/assets/QueryClientProvider-BJlli0Rn.js",
				"/assets/useMutation-BNQvl929.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/staff/new": {
			"id": "routes/staff/new",
			"parentId": "layouts/AppLayout",
			"path": "staff/new",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/new-CD2nhiDT.js",
			"imports": [
				"/assets/utils-BJ0Opo7w.js",
				"/assets/components-CQVDKtAm.js",
				"/assets/jsx-runtime-w3lC_jDG.js",
				"/assets/createBaseUIEventDetails-_oks1XcZ.js",
				"/assets/StaffMemberForm-CRPL-U0t.js",
				"/assets/venue-context-CVnq5NG0.js",
				"/assets/hooks-DdWDv3v9.js",
				"/assets/input-FC_0Rp_H.js",
				"/assets/QueryClientProvider-BJlli0Rn.js",
				"/assets/useMutation-BNQvl929.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/staff/profile": {
			"id": "routes/staff/profile",
			"parentId": "layouts/AppLayout",
			"path": "staff/:staffId",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/profile-DT8yRTy0.js",
			"imports": [
				"/assets/utils-BJ0Opo7w.js",
				"/assets/components-CQVDKtAm.js",
				"/assets/jsx-runtime-w3lC_jDG.js",
				"/assets/createBaseUIEventDetails-_oks1XcZ.js",
				"/assets/StaffMemberForm-CRPL-U0t.js",
				"/assets/x-C3EdBO8Z.js",
				"/assets/textarea-B1i_LdLi.js",
				"/assets/hooks-DdWDv3v9.js",
				"/assets/input-FC_0Rp_H.js",
				"/assets/QueryClientProvider-BJlli0Rn.js",
				"/assets/useMutation-BNQvl929.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		}
	},
	"url": "/assets/manifest-b3acd1f7.js",
	"version": "b3acd1f7",
	"sri": void 0
};
//#endregion
//#region \0virtual:react-router/server-build
var route1 = { default: () => null };
var route2 = { default: () => null };
var route3 = { default: () => null };
var route4 = { default: () => null };
var route5 = { default: () => null };
var route6 = { default: () => null };
var assetsBuildDirectory = "build\\client";
var basename = "/";
var future = {
	"unstable_enableNodeReadableStream": false,
	"unstable_optimizeDeps": false
};
var ssr = false;
var isSpaMode = true;
var prerender = [];
var routeDiscovery = { "mode": "initial" };
var publicPath = "/";
var entry = { module: entry_server_node_exports };
var routes = {
	"root": {
		id: "root",
		parentId: void 0,
		path: "",
		index: void 0,
		caseSensitive: void 0,
		module: root_exports
	},
	"layouts/AppLayout": {
		id: "layouts/AppLayout",
		parentId: "root",
		path: void 0,
		index: void 0,
		caseSensitive: void 0,
		module: route1
	},
	"routes/home": {
		id: "routes/home",
		parentId: "layouts/AppLayout",
		path: void 0,
		index: true,
		caseSensitive: void 0,
		module: route2
	},
	"routes/roster/route": {
		id: "routes/roster/route",
		parentId: "layouts/AppLayout",
		path: "roster",
		index: void 0,
		caseSensitive: void 0,
		module: route3
	},
	"routes/staff/route": {
		id: "routes/staff/route",
		parentId: "layouts/AppLayout",
		path: "staff",
		index: void 0,
		caseSensitive: void 0,
		module: route4
	},
	"routes/staff/new": {
		id: "routes/staff/new",
		parentId: "layouts/AppLayout",
		path: "staff/new",
		index: void 0,
		caseSensitive: void 0,
		module: route5
	},
	"routes/staff/profile": {
		id: "routes/staff/profile",
		parentId: "layouts/AppLayout",
		path: "staff/:staffId",
		index: void 0,
		caseSensitive: void 0,
		module: route6
	}
};
var allowedActionOrigins = false;
//#endregion
export { allowedActionOrigins, server_manifest_default as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, prerender, publicPath, routeDiscovery, routes, ssr };
