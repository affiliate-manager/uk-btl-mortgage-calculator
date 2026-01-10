# UK Buy-to-Let Mortgage Calculator

A comprehensive, PRA-compliant Buy-to-Let mortgage calculator for the UK market, built for [Lendlord](https://lendlord.io/).

## Features

### 1. Affordability Calculator
- PRA SS13/16 compliant stress testing
- Dynamic ICR calculation (125% for Basic Rate/Ltd Co, 145% for Higher Rate)
- Automatic stress rate adjustment for 5-year fixed products
- Support for HMO and MUFB property types

### 2. Monthly Payment Calculator
- Interest-only vs Capital Repayment comparison
- Arrangement fee integration
- Total cost of borrowing calculation

### 3. Rental Yield Calculator
- Gross and Net yield calculations
- Visual gauge display
- Comprehensive cost breakdown
- Yield benchmarking (Poor/Average/Good/Excellent)

### 4. Stamp Duty Calculator
- England/NI (SDLT), Scotland (LBTT), Wales (LTT)
- 3% additional property surcharge
- 2% non-resident surcharge
- Band-by-band breakdown

### 5. Full Investment Analysis
- Total capital required calculation
- Cash-on-cash return
- Section 24 tax impact comparison
- Investment verdict with actionable advice

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Flexbox, Grid, animations
- **Vanilla JavaScript** - No dependencies
- **Font** - Montserrat (Google Fonts)

## Deployment

### Cloudways / Any Web Host

1. Upload the following files to your web root:
   - `index.html`
   - `styles.css`
   - `calculator.js`
   - `data-api.js`
   - `update-rates.php`

2. (Optional) If you have a local Lendlord logo, save it as `logo.png` in the same directory.

3. That's it! No build process required.

### Setting Up Auto-Update (Recommended)

To keep rates automatically updated from the Bank of England:

#### Option 1: Cloudways Cron Job

1. Go to your Cloudways dashboard
2. Select your application
3. Go to **Cron Job Management**
4. Add a new cron job:
   ```
   0 8 * * * php /home/master/applications/YOUR_APP/public_html/update-rates.php
   ```
   This runs daily at 8 AM

#### Option 2: cPanel Cron Job

1. Go to cPanel → Cron Jobs
2. Add new cron job:
   ```
   0 8 * * * /usr/bin/php /home/YOUR_USER/public_html/update-rates.php
   ```

#### Option 3: Manual Update

Visit `https://your-domain.com/update-rates.php?update=true` to manually trigger an update.

#### Verify It's Working

1. After running the update, check `rates.json` - it should contain fresh data
2. Check `rates-update.log` for any errors
3. The calculator will show 🟢 in console if live data is loaded

### GitHub Pages

1. Push all files to your repository
2. Go to Settings → Pages
3. Select your branch and save
4. Access at `https://yourusername.github.io/repo-name/`

## Customization

### Colors
Edit the CSS variables in `styles.css`:

```css
:root {
    --primary: #EBA11F;        /* Main brand color */
    --primary-dark: #d4910e;   /* Darker shade */
    --secondary: #1a1a2e;      /* Dark backgrounds */
}
```

### CTA Links
All CTAs link to:
```
https://app.lendlord.io/online-mortgage-broker?country=uk&utm_source=btl_mortgage_calculator&utm_campaign=Organic
```

To change, find and replace this URL in `index.html`.

### Tax Rates
Update SDLT/LBTT/LTT bands in `calculator.js` in the respective functions:
- `calculateEnglandSDLT()`
- `calculateLBTT()`
- `calculateLTT()`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome for Android)

## Data Sources

This calculator uses **no external APIs** for core functionality. All calculations are performed client-side based on:

- PRA SS13/16 stress testing guidelines
- Current SDLT/LBTT/LTT thresholds (2025/2026)
- Section 24 tax rules

For future API integration, consider:
- **Bank of England IADB** - Base rate data
- **ONS API** - Rental statistics
- **HM Land Registry** - Property price data

## License

© 2026 Lendlord Limited. All rights reserved.

## Support

For questions or feature requests, contact [Lendlord](https://lendlord.io/).

