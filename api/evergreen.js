export default async function handler(req, res) {
  try {
    // ✅ Only env var needed now
    const WIDGET_URL = process.env.EPIC_WIDGET_URL;
    if (!WIDGET_URL) {
      return res.status(500).json({
        error: "Missing environment variable EPIC_WIDGET_URL",
        example:
          "https://mychart.et1270.epichosted.com/mychart/scheduling/onmyway/widget?selDepId=101010103&selRfvId=11"
      });
    }

    const EPIC_ORIGIN = "https://mychart.et1270.epichosted.com";
    const POST_URL =
      "https://mychart.et1270.epichosted.com/MyChart/Scheduling/OnMyWay/GetOnMyWayDepartmentData";

    // 1) GET the widget page to establish cookies + obtain token
    const widgetResp = await fetch(WIDGET_URL, {
      method: "GET",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow"
    });

    const widgetStatus = widgetResp.status;

    // Collect Set-Cookie headers (Vercel/Node supports getSetCookie in newer runtimes)
    const setCookies =
      typeof widgetResp.headers.getSetCookie === "function"
        ? widgetResp.headers.getSetCookie()
        : (widgetResp.headers.raw?.()["set-cookie"] || []);

    // Build a Cookie header string: "a=b; c=d; ..."
    const cookieHeader = setCookies
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");

    const widgetHtml = await widgetResp.text();

    // Try to find __RequestVerificationToken in HTML
    // Common patterns: hidden input, JS assignment, etc.
    const tokenMatch =
      widgetHtml.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i) ||
      widgetHtml.match(/__RequestVerificationToken["']?\s*[:=]\s*["']([^"']+)["']/i);

    const csrfToken = tokenMatch ? tokenMatch[1] : null;

    if (!csrfToken) {
      return res.status(502).json({
        error: "Could not find __RequestVerificationToken on widget page",
        widgetStatus,
        hasSetCookie: setCookies.length > 0,
        cookiePreview: cookieHeader.substring(0, 180),
        htmlPreview: widgetHtml.substring(0, 500)
      });
    }

    if (!cookieHeader) {
      return res.status(502).json({
        error: "Widget page did not provide cookies (Set-Cookie missing)",
        widgetStatus,
        htmlPreview: widgetHtml.substring(0, 500)
      });
    }

    // 2) POST the OnMyWay department data (form encoded, like the browser)
    // Use the richer payload (with coordinates) that you captured
    const rfvId =
      "WP-24rQmk-2FGC-2BmW8pnPncK1Fx9g-3D-3D-24r7f1gf3-2Fdj-2BI1LwPm5KN8-2FY2adj3CGabNn3sZBuaMJ0-3D";

    const searchCoordinatesObj = {
      ModelId: 7,
      _propertyListeners: [],
      IsSpecificLocation: true,
      HasValue: true,
      Coordinates: {
        ModelId: 388,
        _propertyListeners: [],
        Latitude: 47.68245145023804,
        Longitude: -122.1251602869021
      }
    };

    const form = new URLSearchParams();
    form.set("rfvId", rfvId);
    form.set("displayGroupIds", "");
    form.set("searchCoordinates", JSON.stringify(searchCoordinatesObj));

    const epicResp = await fetch(POST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "__RequestVerificationToken": csrfToken,
        "Cookie": cookieHeader,

        "Accept": "application/json, text/plain, */*",
        "Origin": EPIC_ORIGIN,
        "Referer": WIDGET_URL,
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0"
      },
      body: form.toString(),
      redirect: "manual"
    });

    const epicStatus = epicResp.status;
    const contentType = epicResp.headers.get("content-type") || "";
    const location = epicResp.headers.get("location") || null;

    if (!contentType.includes("application/json")) {
      const text = await epicResp.text();
      return res.status(502).json({
        error: "Epic did not return JSON",
        epicStatus,
        location,
        contentType,
        preview: text.substring(0, 600)
      });
    }

    const data = await epicResp.json();
    return res.status(200).json({
      epicStatus,
      data
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      message: err.message,
      stack: err.stack
    });
  }
}
