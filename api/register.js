// Vercel serverless function
// Receives registration data, stores it in Supabase, and sends a WhatsApp notification via Meta Cloud API.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { name, mobile, timeSlot, seatType, message = "" } = req.body || {};

    if (!name || !mobile || !timeSlot || !seatType) {
      return res.status(400).json({
        success: false,
        message: "Name, mobile, time slot and seat type are required.",
      });
    }

    // Basic validation
    const cleanMobile = String(mobile).replace(/\D/g, "");
    if (cleanMobile.length < 10 || cleanMobile.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid mobile number.",
      });
    }

    const registration = {
      name: String(name).trim().slice(0, 100),
      mobile: cleanMobile,
      time_slot: String(timeSlot).slice(0, 50),
      seat_type: String(seatType).slice(0, 50),
      message: String(message).trim().slice(0, 1000),
      created_at: new Date().toISOString(),
    };

    // ---------- 1. Save to Supabase ----------
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  return res.status(500).json({
    success: false,
    message: "Environment variable missing",
    debug: {
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_secret_key: !!process.env.SUPABASE_SECRET_KEY
    }
  });
}

    const supabaseResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/registrations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(registration),
      },
    );

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error("Supabase error:", errorText);
      throw new Error("Could not save registration.");
    }

    // ---------- 2. Send WhatsApp notification ----------
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const to = process.env.WHATSAPP_TO_NUMBER;

    if (!token || !phoneNumberId || !to) {
      throw new Error("WhatsApp environment variables are not configured.");
    }

    // For production, use an approved Meta WhatsApp template.
    // Set WHATSAPP_TEMPLATE_NAME to the exact approved template name.
    // Set WHATSAPP_TEMPLATE_LANGUAGE to its language code, e.g. en_US.
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US";

    if (!templateName) {
      throw new Error("WHATSAPP_TEMPLATE_NAME is not configured.");
    }

    // Template should have 5 body variables:
    // {{1}} Name, {{2}} Mobile, {{3}} Time Slot, {{4}} Seat Type, {{5}} Note
    const graphResponse = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLanguage },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: registration.name },
                  { type: "text", text: registration.mobile },
                  { type: "text", text: registration.time_slot },
                  { type: "text", text: registration.seat_type },
                  { type: "text", text: registration.message || "-" },
                ],
              },
            ],
          },
        }),
      },
    );

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error("WhatsApp API error:", errorText);
      // Registration is already saved, so return a clear partial-success response.
      return res.status(502).json({
        success: false,
        saved: true,
        message:
          "Registration was saved, but WhatsApp notification could not be sent.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Registration saved and WhatsApp notification sent.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error. Please try again.",
    });
  }
}
