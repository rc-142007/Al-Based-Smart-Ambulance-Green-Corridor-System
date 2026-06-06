function getHospitalRecommendation(hospitals, emergencyType) {
  const scoredHospitals = hospitals.map(hospital => {
    let score = 0;
    let reasons = [];

    if (hospital.emergencyAvailable) {
      score += 10;
      reasons.push("Emergency Services Available");
    }

    if (hospital.specialties.criticalCare) {
      score += 20;
      reasons.push("Critical Care Available");
    }

    if (
      emergencyType &&
      hospital.specialties[emergencyType]
    ) {
      score += 50;
      reasons.push(`${emergencyType} Specialist Available`);
    }

    if (hospital.googleETA_min) {
      score += Math.max(0, 30 - hospital.googleETA_min);
    }

    return {
      ...hospital.toObject(),
      aiScore: score,
      reasons
    };
  });
scoredHospitals.sort((a, b) => b.aiScore - a.aiScore);

console.log("Winner:", scoredHospitals[0].hospitalName);

console.table(
  scoredHospitals.map(h => ({
    hospital: h.hospitalName,
    score: h.aiScore
  }))
);

return scoredHospitals[0];

module.exports = {
  getHospitalRecommendation
};
}