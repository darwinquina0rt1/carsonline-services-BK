export const duoConfig = {
  clientId:     process.env.DUO_CLIENT_ID!,      
  clientSecret: process.env.DUO_CLIENT_SECRET!,  
  apiHost:      process.env.DUO_API_HOST!,      
  redirectUrl:  process.env.DUO_REDIRECT_URL!,  
  frontSuccessUrl: process.env.FRONT_SUCCESS_URL || 'http://localhost:5173/auth/callback'
};
