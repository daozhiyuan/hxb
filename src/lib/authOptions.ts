import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          console.log('Missing credentials');
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            console.log('No user found with email:', credentials.email);
            return null; // No user found
          }

          // Validate password
          const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValidPassword) {
            console.log('Invalid password for user:', credentials.email);
            return null; // Invalid password
          }

          if (!user.isActive) {
            console.log('User account is inactive:', credentials.email);
            return null; // User account is inactive
          }

          console.log('Credentials valid for user:', credentials.email);
          // Return user object without password hash
          return {
            id: user.id.toString(), // Must be string for NextAuth
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error('Error during authorization:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' // Use JSON Web Tokens for session management
  },
  secret: process.env.NEXTAUTH_SECRET, // Secret for signing JWTs
  callbacks: {
    // Include user id, name, and role in the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // token.name is already included by default if user.name exists
      }
      return token;
    },
    // Include user id, name, and role in the session object (accessible on the client)
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string; // Add role to session user
        // session.user.name is already included
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Redirect users to /login if they need to sign in
    // error: '/auth/error', // Optional: path to error page
    // signOut: '/auth/signout' // Optional: path to signout page
  }
};
