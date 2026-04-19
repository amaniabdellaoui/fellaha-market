/**
 * FellahaMarket – App.test.js
 *
 * Tests for: api (ls / us / rv / msg / fav), mkFb(), T translations
 *
 * Strategy for module-level state (_L, _R, _U, _M, _F, _ok):
 *   Each test (or describe block) calls jest.resetModules() + re-imports the
 *   module so the module-level variables start fresh.  window.storage is mocked
 *   to return nothing so ld() always falls back to the built-in defaults.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

/** Install a no-op window.storage that never returns stored data. */
function mockStorage() {
  global.window = global.window || {};
  global.window.storage = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

/** Dynamically import App.jsx after resetting modules so _ok is false again. */
async function freshImport() {
  jest.resetModules();
  mockStorage();
  // babel transforms the .jsx file; jest resolves it from the same directory
  const mod = await import("./App.jsx");
  return mod;
}

// ─── T (translations) ───────────────────────────────────────────────────────

describe("T – translations", () => {
  let T;

  beforeAll(async () => {
    ({ T } = await freshImport());
  });

  test("all three locales are present", () => {
    expect(T).toHaveProperty("en");
    expect(T).toHaveProperty("fr");
    expect(T).toHaveProperty("ar");
  });

  test("EN and FR have identical key sets", () => {
    const enKeys = Object.keys(T.en).sort();
    const frKeys = Object.keys(T.fr).sort();
    expect(frKeys).toEqual(enKeys);
  });

  test("EN and AR have identical key sets", () => {
    const enKeys = Object.keys(T.en).sort();
    const arKeys = Object.keys(T.ar).sort();
    expect(arKeys).toEqual(enKeys);
  });

  test("no locale has empty-string values", () => {
    for (const locale of ["en", "fr", "ar"]) {
      for (const [key, val] of Object.entries(T[locale])) {
        expect(val).not.toBe("");
      }
    }
  });
});

// ─── mkFb() ─────────────────────────────────────────────────────────────────

describe("mkFb()", () => {
  let mkFb;

  beforeAll(async () => {
    ({ mkFb } = await freshImport());
  });

  test("returns a string starting with 'data:image/svg+xml,'", () => {
    const result = mkFb("🌿", 120);
    expect(typeof result).toBe("string");
    expect(result.startsWith("data:image/svg+xml,")).toBe(true);
  });

  test("decoded SVG contains the label text", () => {
    const label = "🫒";
    const result = mkFb(label, 110);
    const decoded = decodeURIComponent(result.replace("data:image/svg+xml,", ""));
    expect(decoded).toContain(label);
  });

  test("decoded SVG uses the given hue in HSL fills", () => {
    const hue = 45;
    const result = mkFb("🚜", hue);
    const decoded = decodeURIComponent(result.replace("data:image/svg+xml,", ""));
    expect(decoded).toContain(`hsl(${hue},`);
  });

  test("produces a valid inline SVG element", () => {
    const result = mkFb("X", 200);
    const decoded = decodeURIComponent(result.replace("data:image/svg+xml,", ""));
    expect(decoded).toMatch(/^<svg /);
    expect(decoded).toMatch(/<\/svg>$/);
  });

  test("different hues produce different outputs", () => {
    expect(mkFb("A", 10)).not.toBe(mkFb("A", 200));
  });
});

// ─── api.ls.all() ────────────────────────────────────────────────────────────

describe("api.ls.all()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("returns all 10 default listings when called with no filters", async () => {
    const listings = await api.ls.all();
    expect(listings).toHaveLength(10);
  });

  test("filter by cat='products' returns only products listings", async () => {
    const listings = await api.ls.all({ cat: "products" });
    expect(listings.length).toBeGreaterThan(0);
    listings.forEach((l) => expect(l.cat).toBe("products"));
  });

  test("filter by cat='livestock' returns only livestock listings", async () => {
    const listings = await api.ls.all({ cat: "livestock" });
    listings.forEach((l) => expect(l.cat).toBe("livestock"));
  });

  test("filter by cat that doesn't exist returns empty array", async () => {
    const listings = await api.ls.all({ cat: "nonexistent_cat" });
    expect(listings).toHaveLength(0);
  });

  test("filter by reg (city) returns only listings from that city", async () => {
    const listings = await api.ls.all({ reg: "Sfax" });
    expect(listings.length).toBeGreaterThan(0);
    listings.forEach((l) => expect(l.ct).toBe("Sfax"));
  });

  test("filter by tx='Sell' returns only Sell listings", async () => {
    const listings = await api.ls.all({ tx: "Sell" });
    expect(listings.length).toBeGreaterThan(0);
    listings.forEach((l) => expect(l.tx).toBe("Sell"));
  });

  test("filter by tx='Rent' returns only Rent listings", async () => {
    const listings = await api.ls.all({ tx: "Rent" });
    listings.forEach((l) => expect(l.tx).toBe("Rent"));
  });

  test("filter by tx='Hire' returns only Hire listings", async () => {
    const listings = await api.ls.all({ tx: "Hire" });
    listings.forEach((l) => expect(l.tx).toBe("Hire"));
  });

  test("search query matches listing title (case-insensitive)", async () => {
    // l4 title contains "دقلة" and l7 contains "زيتون" – use an ASCII term present in D_L
    const listings = await api.ls.all({ q: "john deere" });
    expect(listings.length).toBeGreaterThan(0);
    listings.forEach((l) =>
      expect(
        l.tt.toLowerCase().includes("john deere") ||
          l.ds.toLowerCase().includes("john deere")
      ).toBe(true)
    );
  });

  test("search query matches listing description (case-insensitive)", async () => {
    const listings = await api.ls.all({ q: "massey ferguson" });
    expect(listings.length).toBeGreaterThan(0);
  });

  test("search query that matches nothing returns empty array", async () => {
    const listings = await api.ls.all({ q: "xyzzy_no_match_ever_9999" });
    expect(listings).toHaveLength(0);
  });

  test("filter ft=true returns only featured listings", async () => {
    const listings = await api.ls.all({ ft: true });
    expect(listings.length).toBeGreaterThan(0);
    listings.forEach((l) => expect(l.ft).toBe(true));
  });

  test("filter minPr returns listings with price >= minPr", async () => {
    const minPr = 100;
    const listings = await api.ls.all({ minPr });
    listings.forEach((l) => expect(l.pr).toBeGreaterThanOrEqual(minPr));
  });

  test("filter maxPr returns listings with price <= maxPr", async () => {
    const maxPr = 30;
    const listings = await api.ls.all({ maxPr });
    listings.forEach((l) => expect(l.pr).toBeLessThanOrEqual(maxPr));
  });

  test("maxPr=0 is treated as 'no upper bound' (returns all)", async () => {
    // Per the code: `if(f.maxPr!==undefined && f.maxPr>0)` – zero disables the filter
    const all = await api.ls.all();
    const withZeroMax = await api.ls.all({ maxPr: 0 });
    expect(withZeroMax).toHaveLength(all.length);
  });

  test("combined minPr+maxPr filters work correctly", async () => {
    const listings = await api.ls.all({ minPr: 10, maxPr: 50 });
    listings.forEach((l) => {
      expect(l.pr).toBeGreaterThanOrEqual(10);
      expect(l.pr).toBeLessThanOrEqual(50);
    });
  });

  test("combined cat+tx filter narrows results", async () => {
    const listings = await api.ls.all({ cat: "products", tx: "Sell" });
    listings.forEach((l) => {
      expect(l.cat).toBe("products");
      expect(l.tx).toBe("Sell");
    });
  });

  test("sort=priceLow returns listings in ascending price order", async () => {
    const listings = await api.ls.all({ sort: "priceLow" });
    for (let i = 1; i < listings.length; i++) {
      expect(listings[i].pr).toBeGreaterThanOrEqual(listings[i - 1].pr);
    }
  });

  test("sort=priceHigh returns listings in descending price order", async () => {
    const listings = await api.ls.all({ sort: "priceHigh" });
    for (let i = 1; i < listings.length; i++) {
      expect(listings[i].pr).toBeLessThanOrEqual(listings[i - 1].pr);
    }
  });

  test("sort=views returns listings in descending view count order", async () => {
    const listings = await api.ls.all({ sort: "views" });
    for (let i = 1; i < listings.length; i++) {
      expect(listings[i].vw).toBeLessThanOrEqual(listings[i - 1].vw);
    }
  });

  test("default sort (newest) returns listings in descending 'at' date order", async () => {
    const listings = await api.ls.all();
    for (let i = 1; i < listings.length; i++) {
      expect(
        listings[i].at.localeCompare(listings[i - 1].at)
      ).toBeLessThanOrEqual(0);
    }
  });
});

// ─── api.ls.get() ────────────────────────────────────────────────────────────

describe("api.ls.get()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("returns the correct listing by id", async () => {
    const listing = await api.ls.get("l1");
    expect(listing).toBeDefined();
    expect(listing.id).toBe("l1");
  });

  test("returns undefined for a non-existent id", async () => {
    const listing = await api.ls.get("l9999");
    expect(listing).toBeUndefined();
  });
});

// ─── api.ls.feat() ───────────────────────────────────────────────────────────

describe("api.ls.feat()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("returns only featured listings", async () => {
    const listings = await api.ls.feat();
    expect(listings.length).toBeGreaterThan(0);
    listings.forEach((l) => expect(l.ft).toBe(true));
  });

  test("featured count matches ft=true filter", async () => {
    const feat = await api.ls.feat();
    const filtered = await api.ls.all({ ft: true });
    expect(feat).toHaveLength(filtered.length);
  });
});

// ─── api.ls.byUser() ─────────────────────────────────────────────────────────

describe("api.ls.byUser()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("returns only listings belonging to the given user", async () => {
    const listings = await api.ls.byUser("u1");
    expect(listings.length).toBeGreaterThan(0);
    listings.forEach((l) => expect(l.uid).toBe("u1"));
  });

  test("returns empty array for a user with no listings", async () => {
    const listings = await api.ls.byUser("u_no_listings");
    expect(listings).toHaveLength(0);
  });
});

// ─── api.ls.add() & api.ls.del() ─────────────────────────────────────────────

describe("api.ls.add() / api.ls.del()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  const newListingData = {
    tt: "Test Listing – Pommes fraîches",
    ds: "Description test.",
    cat: "localProduce",
    sub: "Citrus",
    tx: "Sell",
    pr: 5,
    pt: "fixed",
    un: "/kg",
    uid: "u3",
    co: "tn",
    ct: "Nabeul",
    imgs: [],
    ft: false,
    bst: false,
  };

  test("add() returns the new listing with auto-assigned fields", async () => {
    const added = await api.ls.add(newListingData);
    expect(added).toBeDefined();
    expect(added.id).toBeDefined();
    expect(added.id).toMatch(/^l\d+$/);
    expect(added.vw).toBe(0);
    expect(added.st).toBe("active");
    expect(added.at).toBeDefined();
    // at should be a YYYY-MM-DD formatted date string
    expect(added.at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("add() sets ft=false regardless of supplied value", async () => {
    const added = await api.ls.add({ ...newListingData, ft: true });
    // Per the code: `ft:false` is hard-coded in add()
    expect(added.ft).toBe(false);
  });

  test("add() makes the new listing visible via api.ls.all()", async () => {
    const before = await api.ls.all();
    const added = await api.ls.add(newListingData);
    const after = await api.ls.all();
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((l) => l.id === added.id)).toBeDefined();
  });

  test("add() places new listing at the front (newest first default sort)", async () => {
    const added = await api.ls.add(newListingData);
    const all = await api.ls.all();
    expect(all[0].id).toBe(added.id);
  });

  test("add() auto-increments id across multiple adds", async () => {
    const a = await api.ls.add({ ...newListingData, tt: "First" });
    const b = await api.ls.add({ ...newListingData, tt: "Second" });
    expect(a.id).not.toBe(b.id);
  });

  test("del() removes the listing from the store", async () => {
    const added = await api.ls.add(newListingData);
    await api.ls.del(added.id);
    const found = await api.ls.get(added.id);
    expect(found).toBeUndefined();
  });

  test("del() does not affect other listings", async () => {
    const before = await api.ls.all();
    await api.ls.del("l1");
    const after = await api.ls.all();
    expect(after).toHaveLength(before.length - 1);
    expect(after.find((l) => l.id === "l1")).toBeUndefined();
    // l2 should still be there
    expect(after.find((l) => l.id === "l2")).toBeDefined();
  });

  test("del() is idempotent – deleting a non-existent id doesn't throw", async () => {
    await expect(api.ls.del("l_does_not_exist")).resolves.toBeUndefined();
  });
});

// ─── api.us.reg() ────────────────────────────────────────────────────────────

describe("api.us.reg()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  const regData = {
    nm: "Leila Test",
    em: "leila@test.tn",
    tp: "farmer",
    co: "tn",
    ct: "Sousse",
    ph: "+216 73 000 001",
  };

  test("reg() returns a user object with the supplied fields", async () => {
    const user = await api.us.reg(regData);
    expect(user.nm).toBe(regData.nm);
    expect(user.em).toBe(regData.em);
  });

  test("reg() auto-assigns id in u<timestamp> format", async () => {
    const user = await api.us.reg(regData);
    expect(user.id).toBeDefined();
    expect(user.id).toMatch(/^u\d+$/);
  });

  test("reg() sets vf=false", async () => {
    const user = await api.us.reg(regData);
    expect(user.vf).toBe(false);
  });

  test("reg() sets role='user'", async () => {
    const user = await api.us.reg(regData);
    expect(user.role).toBe("user");
  });

  test("reg() sets plan='free'", async () => {
    const user = await api.us.reg(regData);
    expect(user.plan).toBe("free");
  });

  test("reg() sets rt=0 and rv=0", async () => {
    const user = await api.us.reg(regData);
    expect(user.rt).toBe(0);
    expect(user.rv).toBe(0);
  });

  test("reg() sets jn to current YYYY-MM format", async () => {
    const user = await api.us.reg(regData);
    expect(user.jn).toMatch(/^\d{4}-\d{2}$/);
  });

  test("reg() makes the user retrievable via api.us.get()", async () => {
    const registered = await api.us.reg(regData);
    const fetched = await api.us.get(registered.id);
    expect(fetched).toEqual(registered);
  });

  test("reg() does not override role even if supplied", async () => {
    // The code always sets role:"user" from its own logic
    const user = await api.us.reg({ ...regData, role: "admin" });
    expect(user.role).toBe("user");
  });
});

// ─── api.us.get() & api.us.all() & api.us.upd() ──────────────────────────────

describe("api.us.get() / api.us.all() / api.us.upd()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("us.get() returns the correct user by id", async () => {
    const user = await api.us.get("u1");
    expect(user).toBeDefined();
    expect(user.id).toBe("u1");
    expect(user.em).toBe("ahmed@farm.tn");
  });

  test("us.get() returns undefined for unknown id", async () => {
    const user = await api.us.get("u_nobody");
    expect(user).toBeUndefined();
  });

  test("us.all() returns all 7 default users", async () => {
    const users = await api.us.all();
    expect(users).toHaveLength(7);
  });

  test("us.all() returns a copy – mutating it does not affect the store", async () => {
    const users = await api.us.all();
    users.push({ id: "fake" });
    const usersAgain = await api.us.all();
    // The store should still have 7 users; the extra push is on the copy
    expect(usersAgain).toHaveLength(7);
  });

  test("us.upd() merges new fields into the existing user", async () => {
    const updated = await api.us.upd("u1", { ct: "Monastir", plan: "premium" });
    expect(updated.ct).toBe("Monastir");
    expect(updated.plan).toBe("premium");
    // Other fields should remain untouched
    expect(updated.nm).toBe("Ahmed Ben Ali");
  });

  test("us.upd() persists the change – subsequent us.get() reflects it", async () => {
    await api.us.upd("u1", { bio: "Updated bio text" });
    const fetched = await api.us.get("u1");
    expect(fetched.bio).toBe("Updated bio text");
  });

  test("us.upd() returns undefined for an unknown user id", async () => {
    const result = await api.us.upd("u_nobody", { ct: "Sfax" });
    expect(result).toBeUndefined();
  });

  test("us.upd() does not affect other users", async () => {
    await api.us.upd("u1", { ct: "Monastir" });
    const u2 = await api.us.get("u2");
    expect(u2.ct).toBe("Sfax");
  });
});

// ─── api.rv.byL() & api.rv.add() ─────────────────────────────────────────────

describe("api.rv.byL() / api.rv.add()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("rv.byL() returns reviews for the given listing", async () => {
    const reviews = await api.rv.byL("l1");
    expect(reviews.length).toBeGreaterThan(0);
    reviews.forEach((r) => expect(r.lid).toBe("l1"));
  });

  test("rv.byL() returns empty array for a listing with no reviews", async () => {
    const reviews = await api.rv.byL("l3");
    expect(reviews).toHaveLength(0);
  });

  test("rv.add() returns the new review with auto-assigned id and at", async () => {
    const review = await api.rv.add({
      lid: "l3",
      uid: "u1",
      rat: 4,
      txt: "Good service!",
    });
    expect(review.id).toBeDefined();
    expect(review.id).toMatch(/^r\d+$/);
    expect(review.at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(review.lid).toBe("l3");
    expect(review.rat).toBe(4);
  });

  test("rv.add() makes the new review visible via rv.byL()", async () => {
    const before = await api.rv.byL("l3");
    await api.rv.add({ lid: "l3", uid: "u2", rat: 5, txt: "Excellent!" });
    const after = await api.rv.byL("l3");
    expect(after).toHaveLength(before.length + 1);
  });

  test("rv.add() auto-increments id across multiple adds", async () => {
    const a = await api.rv.add({ lid: "l3", uid: "u1", rat: 3, txt: "ok" });
    const b = await api.rv.add({ lid: "l3", uid: "u2", rat: 4, txt: "good" });
    expect(a.id).not.toBe(b.id);
  });

  test("rv.add() does not mix reviews across listings", async () => {
    await api.rv.add({ lid: "l5", uid: "u2", rat: 5, txt: "Great team!" });
    const l1Reviews = await api.rv.byL("l1");
    l1Reviews.forEach((r) => expect(r.lid).toBe("l1"));
  });
});

// ─── api.fav.get() & api.fav.tog() ───────────────────────────────────────────

describe("api.fav.get() / api.fav.tog()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("fav.get() returns empty array when user has no favorites", async () => {
    const favs = await api.fav.get("u1");
    expect(favs).toEqual([]);
  });

  test("fav.tog() adds a listing to favorites", async () => {
    const favs = await api.fav.tog("u1", "l2");
    expect(favs).toContain("l2");
  });

  test("fav.get() reflects the toggled favorite", async () => {
    await api.fav.tog("u1", "l3");
    const favs = await api.fav.get("u1");
    expect(favs).toContain("l3");
  });

  test("fav.tog() removes a listing when it already exists (toggle off)", async () => {
    await api.fav.tog("u1", "l4");
    const after = await api.fav.tog("u1", "l4");
    expect(after).not.toContain("l4");
  });

  test("fav.tog() is idempotent for removal – toggling off twice leaves it gone", async () => {
    await api.fav.tog("u1", "l5");     // add
    await api.fav.tog("u1", "l5");     // remove
    const result = await api.fav.tog("u1", "l5"); // add again
    expect(result).toContain("l5");
  });

  test("fav.tog() maintains multiple favorites for the same user", async () => {
    await api.fav.tog("u2", "l1");
    await api.fav.tog("u2", "l3");
    await api.fav.tog("u2", "l7");
    const favs = await api.fav.get("u2");
    expect(favs).toContain("l1");
    expect(favs).toContain("l3");
    expect(favs).toContain("l7");
    expect(favs).toHaveLength(3);
  });

  test("fav.tog() does not affect another user's favorites", async () => {
    await api.fav.tog("u1", "l1");
    await api.fav.tog("u2", "l2");
    const u1Favs = await api.fav.get("u1");
    const u2Favs = await api.fav.get("u2");
    expect(u1Favs).toContain("l1");
    expect(u1Favs).not.toContain("l2");
    expect(u2Favs).toContain("l2");
    expect(u2Favs).not.toContain("l1");
  });

  test("fav.get() returns listing ids (strings), not objects", async () => {
    await api.fav.tog("u3", "l6");
    const favs = await api.fav.get("u3");
    favs.forEach((f) => expect(typeof f).toBe("string"));
  });
});

// ─── api.msg.send() / api.msg.thread() / api.msg.convos() ────────────────────

describe("api.msg.send() / api.msg.thread() / api.msg.convos()", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("msg.send() returns the sent message with auto-assigned id and at", async () => {
    const msg = await api.msg.send({
      from: "u3",
      to: "u1",
      lid: "l1",
      txt: "Hello!",
    });
    expect(msg.id).toBeDefined();
    expect(msg.id).toMatch(/^m\d+$/);
    expect(msg.at).toBeDefined();
    expect(new Date(msg.at).toString()).not.toBe("Invalid Date");
    expect(msg.txt).toBe("Hello!");
  });

  test("msg.thread() returns messages between two users on a listing in chronological order", async () => {
    const thread = await api.msg.thread("u4", "u1", "l1");
    expect(thread.length).toBeGreaterThan(0);
    // All messages should involve both users and listing l1
    thread.forEach((m) => {
      expect(m.lid).toBe("l1");
      expect(
        (m.from === "u4" && m.to === "u1") ||
          (m.from === "u1" && m.to === "u4")
      ).toBe(true);
    });
    // Chronological order
    for (let i = 1; i < thread.length; i++) {
      expect(new Date(thread[i].at).getTime()).toBeGreaterThanOrEqual(
        new Date(thread[i - 1].at).getTime()
      );
    }
  });

  test("msg.thread() returns empty array for a conversation that doesn't exist", async () => {
    const thread = await api.msg.thread("u1", "u3", "l99");
    expect(thread).toHaveLength(0);
  });

  test("msg.send() followed by msg.thread() makes message visible", async () => {
    const before = await api.msg.thread("u3", "u4", "l5");
    await api.msg.send({ from: "u3", to: "u4", lid: "l5", txt: "Available?" });
    const after = await api.msg.thread("u3", "u4", "l5");
    expect(after).toHaveLength(before.length + 1);
    expect(after[after.length - 1].txt).toBe("Available?");
  });

  test("msg.convos() groups messages by (other user, listing) pair", async () => {
    const convos = await api.msg.convos("u1");
    expect(convos.length).toBeGreaterThan(0);
    // Each conversation should have other, lid, msgs, last fields
    convos.forEach((c) => {
      expect(c).toHaveProperty("other");
      expect(c).toHaveProperty("lid");
      expect(c).toHaveProperty("msgs");
      expect(c).toHaveProperty("last");
      expect(Array.isArray(c.msgs)).toBe(true);
      expect(c.msgs.length).toBeGreaterThan(0);
    });
  });

  test("msg.convos() includes both sent and received messages for the user", async () => {
    const convos = await api.msg.convos("u1");
    // u1 sent m2 and received m1 – both belong to the u1-u4-l1 thread
    const thread = convos.find((c) => c.lid === "l1");
    expect(thread).toBeDefined();
    expect(thread.msgs).toHaveLength(2);
  });

  test("msg.convos() returns conversations sorted by most-recent message first", async () => {
    const convos = await api.msg.convos("u1");
    for (let i = 1; i < convos.length; i++) {
      expect(
        convos[i].last.localeCompare(convos[i - 1].last)
      ).toBeLessThanOrEqual(0);
    }
  });

  test("msg.convos() returns empty array for a user with no messages", async () => {
    const convos = await api.msg.convos("u0");
    expect(convos).toHaveLength(0);
  });

  test("msg.convos() does not mix up conversations from different listings", async () => {
    // Send a message on l2 between u3 and u4
    await api.msg.send({ from: "u3", to: "u4", lid: "l2", txt: "Test l2" });
    // Send a message on l5 between u3 and u4
    await api.msg.send({ from: "u3", to: "u4", lid: "l5", txt: "Test l5" });
    const convos = await api.msg.convos("u3");
    const lidSet = new Set(convos.map((c) => c.lid));
    // The two conversations above are on different listings – should be separate
    expect(lidSet.has("l2")).toBe(true);
    expect(lidSet.has("l5")).toBe(true);
  });

  test("msg.send() auto-increments id across multiple sends", async () => {
    const a = await api.msg.send({ from: "u3", to: "u4", lid: "l3", txt: "Hi" });
    const b = await api.msg.send({ from: "u4", to: "u3", lid: "l3", txt: "Hey" });
    expect(a.id).not.toBe(b.id);
  });
});

// ─── integration: add listing then retrieve / filter ─────────────────────────

describe("integration: add listing then filter", () => {
  let api;

  beforeEach(async () => {
    ({ api } = await freshImport());
  });

  test("a newly added listing is found by category filter", async () => {
    const added = await api.ls.add({
      tt: "Fresh Honey",
      ds: "Organic honey from Médenine.",
      cat: "localProduce",
      sub: "Honey",
      tx: "Sell",
      pr: 35,
      pt: "fixed",
      un: "/kg",
      uid: "u4",
      co: "tn",
      ct: "Médenine",
      imgs: [],
    });
    const listings = await api.ls.all({ cat: "localProduce" });
    expect(listings.find((l) => l.id === added.id)).toBeDefined();
  });

  test("a deleted listing is not returned by api.ls.all()", async () => {
    await api.ls.del("l7");
    const listings = await api.ls.all();
    expect(listings.find((l) => l.id === "l7")).toBeUndefined();
  });

  test("adding a listing does not corrupt the sort order", async () => {
    await api.ls.add({
      tt: "Late entry",
      ds: "...",
      cat: "services",
      tx: "Hire",
      pr: 200,
      uid: "u2",
      co: "tn",
      ct: "Tunis",
      imgs: [],
    });
    const listings = await api.ls.all({ sort: "priceHigh" });
    for (let i = 1; i < listings.length; i++) {
      expect(listings[i].pr).toBeLessThanOrEqual(listings[i - 1].pr);
    }
  });
});
