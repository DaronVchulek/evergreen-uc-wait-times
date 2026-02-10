export default async function handler(req, res) {
  try {
    const EPIC_CSRF_TOKEN = process.env.EPIC_CSRF_TOKEN;
    const EPIC_COOKIE = process.env.EPIC_COOKIE;

    if (!EPIC_CSRF_TOKEN || !EPIC_COOKIE) {
      return res.status(500).json({
        error: "Missing environment variables",
        detail: {
          EPIC_CSRF_TOKEN: !!EPIC_CSRF_TOKEN,
          EPIC_COOKIE: !!EPIC_COOKIE
        }
      });
    }

    const epicUrl =
      "https://mychart.et1270.epichosted.com/MyChart/Scheduling/OnMyWay/GetOnMyWayDepartmentData";

    const response = await fetch(epicUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "__RequestVerificationToken": EPIC_CSRF_TOKEN,
        "Cookie": EPIC_COOKIE,
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*"
      },
      body: JSON.stringify({
        rfvId: "11",
        displayGroupIds: "",
        searchCoordinates: null
      }),
      redirect: "manual" // IMPORTANT: exposes Epic redirects
    });

    const contentType = response.headers.get("content-type") || "";
    const status = response.status;

    // If Epic redirects (302) or sends HTML, expose it clearly
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return res.status(502).json({
        error: "Epic did not return JSON",
        epicStatus: status,
        contentType,
        preview: text.substring(0, 300)
      });
    }

    const data = await response.json();

    return res.status(200).json({
      epicStatus: status,
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
