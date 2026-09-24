
// Vercel Serverless Function
// Saves registration data to Supabase only.
// No WhatsApp, SMS or email notification.

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const {
      name,
      mobile,
      timeSlot,
      seatType,
      message = ""
    } = req.body || {};

    // Required fields
    if (!name || !mobile || !timeSlot || !seatType) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields."
      });
    }

    const cleanMobile = String(mobile).replace(/\D/g, "");

    if (cleanMobile.length < 10 || cleanMobile.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid mobile number."
      });
    }

    // Vercel Environment Variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error("Supabase environment variables are missing.");

      return res.status(500).json({
        success: false,
        message: "Server configuration error."
      });
    }

    // Data to save
    const registration = {
      name: String(name).trim().slice(0, 100),
      mobile: cleanMobile,
      time_slot: String(timeSlot).trim().slice(0, 50),
      seat_type: String(seatType).trim().slice(0, 50),
      message: String(message).trim().slice(0, 1000)
    };

    // Save to Supabase
    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/registrations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseSecretKey,
          "Authorization": `Bearer ${supabaseSecretKey}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(registration)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Supabase error:",
        response.status,
        errorText
      );

      return res.status(500).json({
        success: false,
        message: "Could not save registration."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Registration saved successfully."
    });

  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};
