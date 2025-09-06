const { registerFont } = require('canvas');

function loadFonts() {
  try {
    registerFont('./fonts/NotoSans-Regular.ttf', { family: 'NotoSans' });
    registerFont('./fonts/NotoSans-Bold.ttf', { family: 'NotoSans', weight: 'bold' });
    registerFont('./fonts/PatrickHand-Regular.ttf', { family: 'PatrickHand' });
  } catch (err) {
    console.log('Font loading error:', err);
  }
}

module.exports = { loadFonts };


