const convertSfToTam = (sfLevel) => {
  // Variable amplification based on calibration points:
  // SF 6.9 → Tam 7.2 (amp: 0.3)
  // SF 7.6 → Tam 8.0 (amp: 0.4)
  // SF 7.8 → Tam 8.2 (amp: 0.4)
  
  if (sfLevel <= 6.9) {
    return sfLevel + 0.3;
  } else if (sfLevel <= 7.8) {
    const amp = 0.3 + ((sfLevel - 6.9) / (7.8 - 6.9)) * (0.4 - 0.3);
    return sfLevel + amp;
  } else {
    return sfLevel + 0.4;
  }
};