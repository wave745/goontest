# GoonHub - GOON Coin Launch

A Solana-based NSFW creator platform with GOON token launch functionality. This project enables creators to launch tokens with mint addresses ending in "goon".

## Features

- 🪙 Launch GOON tokens with vanity mint addresses ending in "goon"
- 🔐 Wallet integration (Phantom/Solflare)
- 🎨 Dark theme with GOON orange accent colors
- 📱 Responsive design with shadcn/ui components
- ⚡ Pre-generated vanity keypairs for instant mint address assignment

## Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- Solana CLI (v1.18.18+)
- Phantom wallet with devnet SOL
- Supabase account

### 1. Install Dependencies

```bash
yarn install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Set Up Supabase Database

Run this SQL in your Supabase dashboard:

```sql
-- Create tokens table
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL,
  mint_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  supply BIGINT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goon_keypairs table for pre-generated vanity addresses
CREATE TABLE goon_keypairs (
  id SERIAL PRIMARY KEY,
  public_key TEXT UNIQUE NOT NULL,
  secret_key TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up RLS policies
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE goon_keypairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tokens" ON tokens FOR SELECT USING (true);
CREATE POLICY "Owner write tokens" ON tokens FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Public read keypairs" ON goon_keypairs FOR SELECT USING (true);
CREATE POLICY "Admin update keypairs" ON goon_keypairs FOR UPDATE USING (true);
```

### 4. Generate Vanity Keypairs

Run the pre-generation script to create vanity addresses ending in "goon":

```bash
# Install ts-node if not already available
yarn add -D ts-node

# Run the script
npx ts-node pregenGoonKeypairs.ts
```

**Note**: This process can take 2-33 hours depending on your hardware. Consider running it on a cloud VM for faster results.

### 5. Upload Keypairs to Supabase

After generation, upload the keypairs to your `goon_keypairs` table. You can use the Supabase dashboard or create a script to do this programmatically.

### 6. Start Development Server

```bash
yarn dev
```

Visit `http://localhost:3000/coins` to access the GOON coin launch page.

## Usage

### Launching a GOON Coin

1. **Connect Wallet**: Click "Connect Wallet" and select Phantom or Solflare
2. **Enter Token Details**:
   - **Name**: Must end with "GOON" (e.g., "MyAwesomeGoon")
   - **Symbol**: Fixed as "GOON"
   - **Supply**: Total number of tokens to mint
   - **Image URL**: Optional logo/image URL
3. **Launch**: Click "Launch GOON Coin" and approve the transaction
4. **Success**: Copy the mint address and view on Solana Explorer

### Validation Rules

- Token name must end with "GOON"
- Supply must be greater than 0
- Wallet must be connected
- Wallet must have sufficient SOL for transaction fees

## Project Structure

```
client/src/
├── components/
│   ├── Header.tsx          # Navigation with wallet connection
│   └── ui/                 # shadcn/ui components
├── pages/
│   ├── coins.tsx           # GOON coin launch page
│   ├── studio.tsx          # Creator studio dashboard
│   └── ...                 # Other pages
├── lib/                    # Utilities and configurations
└── App.tsx                 # Main app with routing
```

## API Endpoints

The current implementation includes a mock API call. To implement the full backend:

1. Create `/api/coin/launch` endpoint
2. Integrate with Solana Web3.js for transaction building
3. Use pre-generated keypairs from Supabase
4. Store token data after successful mint

## Styling

The project uses Tailwind CSS with custom CSS variables:

```css
:root {
  --bg: #0B0B0B;           /* Black background */
  --panel: #121212;         /* Card backgrounds */
  --text: #EAEAEA;          /* White text */
  --muted: #A0A0A0;         /* Subtext */
  --accent: #F9A11B;        /* GOON orange */
  --accent-2: #FFD089;      /* Light orange */
}
```

## Troubleshooting

### Common Issues

1. **Wallet Connection Fails**
   - Ensure Phantom is set to devnet
   - Check if you have devnet SOL (`solana airdrop 5`)

2. **Transaction Fails**
   - Verify sufficient SOL balance
   - Check browser console for error details

3. **No Vanity Addresses Available**
   - Run the pre-generation script again
   - Check Supabase `goon_keypairs` table

4. **Build Errors**
   - Run `yarn install` to ensure all dependencies
   - Check TypeScript compilation with `yarn check`

### Development Commands

```bash
yarn dev          # Start development server
yarn build        # Build for production
yarn check        # TypeScript type checking
yarn lint         # Run ESLint (if configured)
```

## Next Steps

- [ ] Implement full backend API for coin launch
- [ ] Add real-time progress indicators
- [ ] Integrate with Solana mainnet
- [ ] Add token management dashboard
- [ ] Implement creator analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section above
- Review browser console for error messages
- Ensure all prerequisites are met
- Verify Supabase configuration

---

**Note**: This is a development version. For production use, ensure proper security measures, mainnet configuration, and compliance with relevant regulations.
