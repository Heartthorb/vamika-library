// Vercel serverless function: save registration data only.
// No WhatsApp/SMS/email notification is sent.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const { name, mobile, timeSlot, seatType, message = "" } = req.body || {};

    if (!name || !mobile || !timeSlot || !seatType) {
      return res.status(400).json({
        success: false,
        message: "Name, mobile, time slot and seat type are required."
      });
    }

    const cleanMobile = String(mobile).replace(/\D/g, "");

    if (cleanMobile.length < 10 || cleanMobile.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid mobile number."
      });
    }

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

    const registration = {
      name: String(name).trim().slice(0, 100),
      mobile: cleanMobile,
      time_slot: String(timeSlot).slice(0, 50),
      seat_type: String(seatType).slice(0, 50),
      message: String(message).trim().slice(0, 1000)
    };

    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/registrations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.SUPABASE_SECRET_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(registration)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase error:", errorText);

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
}
