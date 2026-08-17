const USER_KEY = "xianghe-user";

export function userId() {
  return localStorage.getItem(USER_KEY) || "demo-user";
}

async function req(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  health: () => req("/api/health"),
  me: () => req(`/api/me?userId=${userId()}`),
  setVip: (vip) => req("/api/me/vip", { method: "POST", body: JSON.stringify({ userId: userId(), vip }) }),
  materials: (q = "") => req(`/api/materials?userId=${userId()}&q=${encodeURIComponent(q)}`),
  material: (name) => req(`/api/materials/${encodeURIComponent(name)}`),
  classics: () => req("/api/classics"),
  solar: () => req("/api/solar-terms"),
  generate: (body) => req("/api/generate", { method: "POST", body: JSON.stringify({ ...body, userId: userId() }) }),
  adjust: (body) => req("/api/generate/adjust", { method: "POST", body: JSON.stringify({ ...body, userId: userId() }) }),
  validate: (body) => req("/api/validate", { method: "POST", body: JSON.stringify({ ...body, userId: userId() }) }),
  diy: (body) => req("/api/diy", { method: "POST", body: JSON.stringify(body) }),
  formulas: () => req("/api/formulas"),
  formula: (id) => req(`/api/formulas/${id}`),
  saveCard: (body) => req("/api/cards", { method: "POST", body: JSON.stringify(body) }),
  card: (id) => req(`/api/cards/${id}`),
  shop: () => req("/api/shop/kits"),
  device: () => req("/api/device/presets"),
  runDevice: (preset) => req("/api/device/run", { method: "POST", body: JSON.stringify({ preset }) }),
};
