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

    // 👇 Use the exact rfvId from your working browser request
    const rfvId =
      "WP-24rQmk-2FGC-2BmW8pnPncK1Fx9g-3D-3D-24r7f1gf3-2Fdj-2BI1LwPm5KN8-2FY2adj3CGabNn3sZBuaMJ0-3D";

    // 👇 Coordinates from your successful browser request
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

    const response = await fetch(epicUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "__RequestVerificationToken": EPIC_CSRF_TOKEN,
        "Cookie": EPIC_COOKIE,
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://mychart.et1270.epichosted.com",
        "Referer":
          "https://mychart.et1270.epichosted.com/mychart/scheduling/onmyway/widget?selDepId=101010103&selRfvId=11",
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0"
      },
      body: form.toString(),
      redirect: "manual"
    });

    const status = response.status;
    const contentType = response.headers.get("content-type") || "";
    const location = response.headers.get("location") || null;

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      return res.status(502).json({
        error: "Epic did not return JSON",
        epicStatus: status,
        location,
        contentType,
        preview: text.substring(0, 500)
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
