const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = 'yashk0534375-collab';

// --- CONFIGURATION ---
const GRID_COLS = 53;
const GRID_ROWS = 7;
const CELL_SIZE = 11;
const CELL_GAP = 3;
const GRID_OFFSET_X = 0;
const GRID_OFFSET_Y = 35;
const GOKU_SCALE = 1;
const GOKU_START_X = -72;

// --- GOKU SPRITE (Base64) ---
const GOKU_SPRITE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAA8CAMAAAA/YvXjAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAzUExURUdwTP///wAAAJ+fn+vr65CQkNDQ0KCgoNXV1ejo6Hx8fGBgYM/PzxAQELCwsLi4uNnZ2R3Xk6sAAAACdFJOU/8A5bcwSgAAAedJREFUSMftlsF2wyAMQxlIbAK0Tdv//9lOSLtu191OZy/zXmIIPAgS2uPxp2LhPxX7O2K/h8XUry0mR+L0T9hQnK9t9tV2u0O+78A3hG2yN3vV/BvIthb7sUuA+wZ2g23bBmyf4LaxpXh1uN0AtoetLfaLz8fHh2N7rW1b7Lfh+flZgO3i2sZ1uI/g3sE9sLXF1uA+gb0H9wA2Y39Z22a00/jI4L6AbWwvsB/8+fnZ9n1fXNdj200c14vtzUfCfcL2bNtsL2w97n7e02a7YGuA38A+zHaxH8D2C2wP+9jB3q8h1mK3Fnu/2Bpgn2a7sB/Adgv2Bntb1zWzM1sL2A+ztdjm7L0W2P1ir2PbdXfVvM62H+Y2H/k12Bpgn2C72HqA3cFWLbbJ1h73CWy1Yutst9h62AfsA+xjH3tb2wvsDvtVfGSwtbY1tmk9tgm2AXYP2Aawj221YGuA3cN2sT22V1t7bK+2tbZl21psn+2xTbbNtgH2D2wP+72tAXYHW8M22dbYHrYJth72K7Y1tsm2Btg9bBfbY3u1rcX2amux1bA1wO5ha4Ddwza2NbbJtjW2h22yvcA+toetcXvYJthfbe2xvdraY6thv2KbbJtta2xrbGtsjW2NbbKtwa2xPcB+xzbZNtnW2Bpg97A1wO5gH9sE2wBba2u2NbY1tse2xrbGtsa2xrbG9tjW2B7bGtsa2wBba5tsm21rbA2we9h6gP3V1h7bq609toetAXYHW2O/YptsV2xtsE2wNbbJtsbW2Bpg97A1wO5g621tthbbY7u21bbGlm1vthbbnL3Z2mKbszdbW2xz9mZri23O3mxtsc3Zl21tsTXYGmD3sP2yfbJtta2xrbGtsa2xrbGtsa2xrbGtsa2xrbE1tjW2NbbG1tgaYGuA3cPWA/w37D/7A70m/R0n9aQGAAAAAElFTkSuQmCC";

// --- 1. FETCH CONTRIBUTIONS ---
async function fetchContributions() {
  const query = `
    query {
      user(login: "${USERNAME}") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                color
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json();
  const weeks = data.data.user.contributionsCollection.contributionCalendar.weeks;
  
  let grid = [];
  weeks.forEach((week, x) => {
    week.contributionDays.forEach((day) => {
      const date = new Date(day.date);
      grid.push({
        x: x,
        y: date.getUTCDay(),
        count: day.contributionCount,
        date: day.date
      });
    });
  });

  return grid;
}

// --- 2. GENERATE SVG ---
function generateSVG(grid) {
  const colors = {
    empty: '#161b22',
    low: '#0e4429',
    midLow: '#006d32',
    midHigh: '#26a641',
    high: '#39d353',
  };

  const totalWidth = GRID_COLS * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const totalHeight = GRID_ROWS * (CELL_SIZE + CELL_GAP) - CELL_GAP + 60;
  const totalDistance = totalWidth + 80 - GOKU_START_X;
  const animationDuration = 8;

  let cellsHTML = grid.map((cell) => {
    const x = GRID_OFFSET_X + cell.x * (CELL_SIZE + CELL_GAP);
    const y = GRID_OFFSET_Y + cell.y * (CELL_SIZE + CELL_GAP);
    
    // Determine color
    let color = colors.empty;
    if (cell.count > 0) color = colors.low;
    if (cell.count > 3) color = colors.midLow;
    if (cell.count > 6) color = colors.midHigh;
    if (cell.count > 9) color = colors.high;

    // Fading animation for middle rows (2, 3, 4)
    if (cell.y >= 2 && cell.y <= 4) {
      const tCol = (x - GOKU_START_X) / totalDistance;
      const fadeStart = Math.max(0.001, tCol - 0.035);
      const fadeEnd   = Math.min(0.998, tCol + 0.015);
      const holdEnd   = Math.min(0.998, tCol + 0.04);
      const restoreEnd = Math.min(0.999, tCol + 0.10);

      if (restoreEnd >= 0.999) {
        return `    <rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" fill="${color}" class="cell">
      <animate attributeName="opacity" values="1; 1; 0; 0" keyTimes="0; ${fadeStart.toFixed(3)}; ${fadeEnd.toFixed(3)}; 1" dur="${animationDuration}s" repeatCount="indefinite"/>
    </rect>`;
      }
      return `    <rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" fill="${color}" class="cell">
      <animate attributeName="opacity" values="1; 1; 0; 0; 1; 1" keyTimes="0; ${fadeStart.toFixed(3)}; ${fadeEnd.toFixed(3)}; ${holdEnd.toFixed(3)}; ${restoreEnd.toFixed(3)}; 1" dur="${animationDuration}s" repeatCount="indefinite"/>
    </rect>`;
    }

    return `    <rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" fill="${color}" class="cell" />`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <defs>
    <style>
      .cell { rx: 2px; ry: 2px; }
    </style>
  </defs>

${cellsHTML}

  <g>
    <animateTransform attributeName="transform" type="translate" values="${GOKU_START_X},0; ${totalWidth + 80},0" dur="${animationDuration}s" repeatCount="indefinite" />
    
    <!-- Nimbus Tail (Trails infinitely to the left) -->
    <rect x="-2000" y="${GRID_OFFSET_Y + 20 + 44}" width="2015" height="2" fill="#d85b16" />
    <rect x="-2000" y="${GRID_OFFSET_Y + 20 + 46}" width="2015" height="4" fill="#ffdf95" />
    <rect x="-2000" y="${GRID_OFFSET_Y + 20 + 50}" width="2015" height="2" fill="#d85b16" />

    <image 
      href="${GOKU_SPRITE}" 
      xlink:href="${GOKU_SPRITE}" 
      x="0" 
      y="${GRID_OFFSET_Y + 20}" 
      width="43" 
      height="60" 
      transform="scale(${GOKU_SCALE}, ${GOKU_SCALE})"
    />
  </g>
</svg>`;
}

// --- 3. EXECUTE ---
async function main() {
  try {
    if (!GITHUB_TOKEN) {
      console.error("Missing GITHUB_TOKEN environment variable");
      process.exit(1);
    }
    console.log("Fetching contributions...");
    const grid = await fetchContributions();
    
    console.log("Generating SVG...");
    const svg = generateSVG(grid);
    
    fs.writeFileSync('goku-contribution-graph-dark.svg', svg);
    console.log("✅ Successfully saved to goku-contribution-graph-dark.svg");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
