import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';

export async function seedInitialData() {
  const teamsSnap = await getDocs(collection(db, 'teams'));
  if (teamsSnap.empty) {
    const teams = [
      { id: 'TEAM_ALPHA', name: 'AMB-04', type: 'ambulance', status: 'idle', leaderId: 'L1', currentLocation: { latitude: 19.0760, longitude: 72.8777 } },
      { id: 'TEAM_BRAVO', name: 'FIRE-12', type: 'fire_brigade', status: 'idle', leaderId: 'L2', currentLocation: { latitude: 19.0330, longitude: 72.8574 } },
      { id: 'TEAM_CHARLIE', name: 'POL-08', type: 'police', status: 'idle', leaderId: 'L3', currentLocation: { latitude: 19.1176, longitude: 72.8479 } },
    ];

    for (const team of teams) {
      await setDoc(doc(db, 'teams', team.id), {
        ...team,
        updatedAt: serverTimestamp()
      });
    }
  }

  const resourcesSnap = await getDocs(collection(db, 'resources'));
  if (resourcesSnap.empty) {
    const resources = [
      { id: 'RES_1', name: 'Mumbai City Hospital', type: 'hospital_beds', availableCount: 14, totalCount: 250, location: { latitude: 19.0760, longitude: 72.8777 } },
      { id: 'RES_2', name: 'BKC Oxygen Hub', type: 'oxygen_cylinders', availableCount: 482, totalCount: 500, location: { latitude: 19.0607, longitude: 72.8633 } },
      { id: 'RES_3', name: 'South Mumbai Blood Bank', type: 'blood_units', availableCount: 12, totalCount: 50, location: { latitude: 18.9219, longitude: 72.8347 } },
      { id: 'RES_4', name: 'Western Express Garage', type: 'rescue_vehicles', availableCount: 8, totalCount: 10, location: { latitude: 19.2185, longitude: 72.8631 } },
    ];

    for (const res of resources) {
      await setDoc(doc(db, 'resources', res.id), {
        ...res,
        updatedAt: serverTimestamp()
      });
    }
  }
}
