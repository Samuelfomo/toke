import { apiFetch } from '@/utils/Fetch.Client';
export default class OtpService {


  static async verifyOtp(otp: number): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>
  {
    try {
      // const response = await fetch(`${import.meta.env.VITE_API_URL}:${import.meta.env.VITE_API_PORT}/user/verify-otp`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ otp })
      // });
      const response = await apiFetch({
        path: "/user/verify-otp",
        method: "POST",
        body: JSON.stringify({ otp }),
});

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Erreur lors de la vérification de l’OTP'
        };
      }

      return {
        success: true,
        message: data.message || 'OTP vérifié avec succès'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur réseau'
      };
    }
  }

}

// import { apiFetch } from '@/utils/Fetch.Client';
//
// // GET
// const data = await apiFetch({ path: "/qr-code" });
//
// // POST
// const result = await apiFetch({
//   path: "/qr-code",
//   method: "POST",
//   body: JSON.stringify({ shared: true }),
// });