'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { addItemCart } from './../../store/cartSlice';
import { confirmLocation } from './../../store/locationSlice';

export default function LocationSelector() {
  const router = useRouter();
  const dispatch = useDispatch();

  const isConfirmed = useSelector((state) => state.location.isConfirmed);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDeliveryMessage, setShowDeliveryMessage] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  useEffect(() => {
    const pendingItem = localStorage.getItem('pendingProduct');
    if (pendingItem) {
      setPendingProduct(JSON.parse(pendingItem));
    }
  }, []);

  // If already confirmed, skip page
  useEffect(() => {
    const isChangingLocation = sessionStorage.getItem('changingLocation');

    if (isConfirmed && !isChangingLocation) {
      router.replace('/');
    }

    if (isChangingLocation) {
      sessionStorage.removeItem('changingLocation');
    }
  }, [isConfirmed, router]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.length >= 2) {
        searchLocations();
      } else {
        setSearchResults([]);
        setShowDeliveryMessage(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const searchLocations = async () => {
    setLoading(true);
    setShowDeliveryMessage(false);

    try {
      const mockLocations = [
        // AGEGE LGA
        { id: 1, text: 'Agege', place_name: 'Agege, Lagos, Nigeria', center: [3.3240, 6.6158] },
        { id: 2, text: 'Dopemu', place_name: 'Dopemu, Agege, Lagos, Nigeria', center: [3.3200, 6.6100] },
        { id: 3, text: 'Fagba', place_name: 'Fagba, Agege, Lagos, Nigeria', center: [3.3280, 6.6200] },
        { id: 4, text: 'Oke-Odo', place_name: 'Oke-Odo, Agege, Lagos, Nigeria', center: [3.3150, 6.6080] },
        { id: 5, text: 'Orile Agege', place_name: 'Orile Agege, Lagos, Nigeria', center: [3.3190, 6.6120] },

        // AJEROMI-IFELODUN LGA
        { id: 6, text: 'Ajegunle', place_name: 'Ajegunle, Lagos, Nigeria', center: [3.3200, 6.4500] },
        { id: 7, text: 'Kirikiri', place_name: 'Kirikiri, Lagos, Nigeria', center: [3.3150, 6.4550] },
        { id: 8, text: 'Tolu', place_name: 'Tolu, Lagos, Nigeria', center: [3.3100, 6.4480] },
        { id: 9, text: 'Layeni', place_name: 'Layeni, Lagos, Nigeria', center: [3.3180, 6.4520] },
        { id: 10, text: 'Orile-Iganmu', place_name: 'Orile-Iganmu, Lagos, Nigeria', center: [3.3220, 6.4580] },

        // ALIMOSHO LGA
        { id: 11, text: 'Abule-Egba', place_name: 'Abule-Egba, Lagos, Nigeria', center: [3.2950, 6.6400] },
        { id: 12, text: 'Agbado', place_name: 'Agbado, Lagos, Nigeria', center: [3.2800, 6.6500] },
        { id: 13, text: 'Akowonjo', place_name: 'Akowonjo, Lagos, Nigeria', center: [3.2900, 6.5900] },
        { id: 14, text: 'Ayobo', place_name: 'Ayobo, Lagos, Nigeria', center: [3.2750, 6.6200] },
        { id: 15, text: 'Egbeda', place_name: 'Egbeda, Lagos, Nigeria', center: [3.2850, 6.5950] },
        { id: 16, text: 'Idimu', place_name: 'Idimu, Lagos, Nigeria', center: [3.2800, 6.5800] },
        { id: 17, text: 'Igando', place_name: 'Igando, Lagos, Nigeria', center: [3.2650, 6.5700] },
        { id: 18, text: 'Ikotun', place_name: 'Ikotun, Lagos, Nigeria', center: [3.2600, 6.5650] },
        { id: 19, text: 'Ipaja', place_name: 'Ipaja, Lagos, Nigeria', center: [3.2700, 6.6100] },
        { id: 20, text: 'Iyana-Ipaja', place_name: 'Iyana-Ipaja, Lagos, Nigeria', center: [3.2680, 6.6150] },
        { id: 21, text: 'Meiran', place_name: 'Meiran, Lagos, Nigeria', center: [3.2950, 6.6350] },

        // AMUWO-ODOFIN LGA
        { id: 22, text: 'Festac Town', place_name: 'Festac Town, Lagos, Nigeria', center: [3.2792, 6.4667] },
        { id: 23, text: 'Amuwo-Odofin', place_name: 'Amuwo-Odofin, Lagos, Nigeria', center: [3.2850, 6.4600] },
        { id: 24, text: 'Mile 2', place_name: 'Mile 2, Lagos, Nigeria', center: [3.3100, 6.4400] },
        { id: 25, text: 'Satellite Town', place_name: 'Satellite Town, Lagos, Nigeria', center: [3.2900, 6.4550] },
        { id: 26, text: 'Trade Fair Complex', place_name: 'Trade Fair Complex, Lagos, Nigeria', center: [3.2950, 6.4580] },
        { id: 27, text: 'Abule-Ado', place_name: 'Abule-Ado, Lagos, Nigeria', center: [3.2700, 6.4500] },

        // APAPA LGA
        { id: 28, text: 'Apapa', place_name: 'Apapa, Lagos, Nigeria', center: [3.3667, 6.4500] },
        { id: 29, text: 'Apapa GRA', place_name: 'Apapa GRA, Lagos, Nigeria', center: [3.3700, 6.4550] },
        { id: 30, text: 'Ijora', place_name: 'Ijora, Lagos, Nigeria', center: [3.3600, 6.4600] },
        { id: 31, text: 'Liverpool', place_name: 'Liverpool, Apapa, Lagos, Nigeria', center: [3.3650, 6.4480] },

        // BADAGRY LGA
        { id: 32, text: 'Badagry', place_name: 'Badagry, Lagos, Nigeria', center: [2.8877, 6.4132] },
        { id: 33, text: 'Ajara', place_name: 'Ajara, Badagry, Lagos, Nigeria', center: [2.8800, 6.4100] },
        { id: 34, text: 'Agbara', place_name: 'Agbara, Lagos, Nigeria', center: [3.1300, 6.4800] },
        { id: 35, text: 'Okokomaiko', place_name: 'Okokomaiko, Lagos, Nigeria', center: [3.2200, 6.4650] },

        // EPE LGA
        { id: 36, text: 'Epe', place_name: 'Epe, Lagos, Nigeria', center: [3.9833, 6.5833] },
        { id: 37, text: 'Ejinrin', place_name: 'Ejinrin, Epe, Lagos, Nigeria', center: [3.9500, 6.5500] },
        { id: 38, text: 'Eredo', place_name: 'Eredo, Epe, Lagos, Nigeria', center: [3.9600, 6.5600] },

        // ETI-OSA LGA
        { id: 39, text: 'Victoria Island', place_name: 'Victoria Island, Lagos, Nigeria', center: [3.4166, 6.4302] },
        { id: 40, text: 'Ikoyi', place_name: 'Ikoyi, Lagos, Nigeria', center: [3.4441, 6.4518] },
        { id: 41, text: 'Lekki Phase 1', place_name: 'Lekki Phase 1, Lagos, Nigeria', center: [3.4740, 6.4474] },
        { id: 42, text: 'Chevron', place_name: 'Chevron, Lekki, Lagos, Nigeria', center: [3.5000, 6.4400] },
        { id: 43, text: 'Ajah', place_name: 'Ajah, Lagos, Nigeria', center: [3.5667, 6.4667] },

        // IBEJU-LEKKI LGA
        { id: 44, text: 'Lakowe', place_name: 'Lakowe, Ibeju-Lekki, Lagos, Nigeria', center: [3.6500, 6.4200] },
        { id: 45, text: 'Sangotedo', place_name: 'Sangotedo, Ajah, Lagos, Nigeria', center: [3.5800, 6.4600] },
        { id: 46, text: 'Awoyaya', place_name: 'Awoyaya, Ibeju-Lekki, Lagos, Nigeria', center: [3.6200, 6.4500] },
        { id: 47, text: 'Bogije', place_name: 'Bogije, Ibeju-Lekki, Lagos, Nigeria', center: [3.6000, 6.4400] },
        { id: 48, text: 'Abijo', place_name: 'Abijo, Ibeju-Lekki, Lagos, Nigeria', center: [3.5900, 6.4350] },

        // IFAKO-IJAIYE LGA
        { id: 49, text: 'Alakuko', place_name: 'Alakuko, Lagos, Nigeria', center: [3.2500, 6.6300] },
        { id: 50, text: 'Alagbado', place_name: 'Alagbado, Lagos, Nigeria', center: [3.2600, 6.6250] },
        { id: 51, text: 'Ifako', place_name: 'Ifako, Lagos, Nigeria', center: [3.3400, 6.6000] },
        { id: 52, text: 'Ijaiye', place_name: 'Ijaiye, Lagos, Nigeria', center: [3.3300, 6.5950] },
        { id: 53, text: 'Iju', place_name: 'Iju, Lagos, Nigeria', center: [3.3350, 6.5900] },
        { id: 54, text: 'Ogba', place_name: 'Ogba, Lagos, Nigeria', center: [3.3450, 6.5850] },
        { id: 55, text: 'Ojokoro', place_name: 'Ojokoro, Lagos, Nigeria', center: [3.2400, 6.6200] },

        // IKEJA LGA
        { id: 56, text: 'Ikeja', place_name: 'Ikeja, Lagos, Nigeria', center: [3.3515, 6.5964] },
        { id: 57, text: 'Ikeja GRA', place_name: 'Ikeja GRA, Lagos, Nigeria', center: [3.3550, 6.5900] },
        { id: 58, text: 'Allen Avenue', place_name: 'Allen Avenue, Ikeja, Lagos, Nigeria', center: [3.3600, 6.5850] },
        { id: 59, text: 'Computer Village', place_name: 'Computer Village, Ikeja, Lagos, Nigeria', center: [3.3580, 6.5920] },
        { id: 60, text: 'Ojodu', place_name: 'Ojodu, Lagos, Nigeria', center: [3.3669, 6.6257] },
        { id: 61, text: 'Omole Phase 1', place_name: 'Omole Phase 1, Lagos, Nigeria', center: [3.3700, 6.6200] },
        { id: 62, text: 'Omole Phase 2', place_name: 'Omole Phase 2, Lagos, Nigeria', center: [3.3750, 6.6180] },
        { id: 63, text: 'Berger', place_name: 'Berger, Lagos, Nigeria', center: [3.3679, 6.6205] },
        { id: 64, text: 'Adeniyi Jones', place_name: 'Adeniyi Jones, Ikeja, Lagos, Nigeria', center: [3.3620, 6.5880] },
        { id: 65, text: 'Alausa', place_name: 'Alausa, Ikeja, Lagos, Nigeria', center: [3.3500, 6.6000] },
        { id: 66, text: 'Maryland', place_name: 'Maryland, Lagos, Nigeria', center: [3.3792, 6.5244] },
        { id: 67, text: 'Anthony Village', place_name: 'Anthony Village, Lagos, Nigeria', center: [3.3800, 6.5300] },
        { id: 68, text: 'Oregun', place_name: 'Oregun, Lagos, Nigeria', center: [3.3750, 6.5350] },
        { id: 69, text: 'Opebi', place_name: 'Opebi, Lagos, Nigeria', center: [3.3650, 6.5800] },

        // IKORODU LGA
        { id: 70, text: 'Ikorodu', place_name: 'Ikorodu, Lagos, Nigeria', center: [3.5106, 6.6194] },
        { id: 71, text: 'Agbowa', place_name: 'Agbowa, Ikorodu, Lagos, Nigeria', center: [3.4800, 6.5800] },
        { id: 72, text: 'Ijede', place_name: 'Ijede, Ikorodu, Lagos, Nigeria', center: [3.4500, 6.5900] },
        { id: 73, text: 'Igbogbo', place_name: 'Igbogbo, Ikorodu, Lagos, Nigeria', center: [3.4600, 6.5850] },
        { id: 74, text: 'Imota', place_name: 'Imota, Ikorodu, Lagos, Nigeria', center: [3.4700, 6.6000] },
        { id: 75, text: 'Ebute Ikorodu', place_name: 'Ebute, Ikorodu, Lagos, Nigeria', center: [3.5000, 6.6100] },
        { id: 76, text: 'Gberigbe', place_name: 'Gberigbe, Ikorodu, Lagos, Nigeria', center: [3.4950, 6.6050] },

        // KOSOFE LGA
        { id: 77, text: 'Ketu', place_name: 'Ketu, Lagos, Nigeria', center: [3.3833, 6.6000] },
        { id: 78, text: 'Alapere', place_name: 'Alapere, Lagos, Nigeria', center: [3.3900, 6.5950] },
        { id: 79, text: 'Anthony', place_name: 'Anthony, Lagos, Nigeria', center: [3.3850, 6.5900] },
        { id: 80, text: 'Mile 12', place_name: 'Mile 12, Lagos, Nigeria', center: [3.3600, 6.5700] },
        { id: 81, text: 'Ogudu', place_name: 'Ogudu, Lagos, Nigeria', center: [3.3950, 6.5650] },
        { id: 82, text: 'Gbagada', place_name: 'Gbagada, Lagos, Nigeria', center: [3.3893, 6.5439] },
        { id: 83, text: 'Oworonshoki', place_name: 'Oworonshoki, Lagos, Nigeria', center: [3.3800, 6.5500] },

        // LAGOS ISLAND LGA
        { id: 84, text: 'Lagos Island', place_name: 'Lagos Island, Lagos, Nigeria', center: [3.3958, 6.4541] },
        { id: 85, text: 'Idumota', place_name: 'Idumota, Lagos Island, Nigeria', center: [3.3900, 6.4600] },
        { id: 86, text: 'Epetedo', place_name: 'Epetedo, Lagos Island, Nigeria', center: [3.3980, 6.4580] },
        { id: 87, text: 'Isale-Eko', place_name: 'Isale-Eko, Lagos Island, Nigeria', center: [3.3950, 6.4520] },

        // LAGOS MAINLAND LGA
        { id: 88, text: 'Ebute-Metta', place_name: 'Ebute-Metta, Lagos, Nigeria', center: [3.3750, 6.4750] },
        { id: 89, text: 'Yaba', place_name: 'Yaba, Lagos, Nigeria', center: [3.3792, 6.5156] },
        { id: 90, text: 'Oyingbo', place_name: 'Oyingbo, Lagos, Nigeria', center: [3.3800, 6.4900] },
        { id: 91, text: 'Iddo', place_name: 'Iddo, Lagos, Nigeria', center: [3.3700, 6.4650] },

        // MUSHIN LGA
        { id: 92, text: 'Mushin', place_name: 'Mushin, Lagos, Nigeria', center: [3.3500, 6.5292] },
        { id: 93, text: 'Daleko', place_name: 'Daleko, Mushin, Lagos, Nigeria', center: [3.3450, 6.5250] },
        { id: 94, text: 'Itire', place_name: 'Itire, Mushin, Lagos, Nigeria', center: [3.3550, 6.5350] },
        { id: 95, text: 'Odi-Olowo', place_name: 'Odi-Olowo, Mushin, Lagos, Nigeria', center: [3.3480, 6.5280] },

        // OJO LGA
        { id: 96, text: 'Ojo', place_name: 'Ojo, Lagos, Nigeria', center: [3.1583, 6.4583] },
        { id: 97, text: 'Ajangbadi', place_name: 'Ajangbadi, Lagos, Nigeria', center: [3.1800, 6.4650] },
        { id: 98, text: 'Alaba Rago', place_name: 'Alaba Rago, Lagos, Nigeria', center: [3.1792, 6.4583] },
        { id: 99, text: 'Iba', place_name: 'Iba, Lagos, Nigeria', center: [3.1900, 6.4700] },
        { id: 100, text: 'Ijanikin', place_name: 'Ijanikin, Lagos, Nigeria', center: [3.2000, 6.4750] },
        { id: 101, text: 'Shibiri', place_name: 'Shibiri, Lagos, Nigeria', center: [3.1700, 6.4500] },

        // OSHODI-ISOLO LGA
        { id: 102, text: 'Oshodi', place_name: 'Oshodi, Lagos, Nigeria', center: [3.3375, 6.5483] },
        { id: 103, text: 'Isolo', place_name: 'Isolo, Lagos, Nigeria', center: [3.3208, 6.5375] },
        { id: 104, text: 'Ajao Estate', place_name: 'Ajao Estate, Lagos, Nigeria', center: [3.3150, 6.5300] },
        { id: 105, text: 'Bolade', place_name: 'Bolade, Oshodi, Lagos, Nigeria', center: [3.3300, 6.5450] },
        { id: 106, text: 'Ejigbo', place_name: 'Ejigbo, Lagos, Nigeria', center: [3.3000, 6.5400] },
        { id: 107, text: 'Ikeja Along', place_name: 'Ikeja Along, Lagos, Nigeria', center: [3.3400, 6.5500] },
        { id: 108, text: 'Mafoluku', place_name: 'Mafoluku, Lagos, Nigeria', center: [3.3100, 6.5350] },
        { id: 109, text: 'Okota', place_name: 'Okota, Lagos, Nigeria', center: [3.3050, 6.5250] },

        // SHOMOLU LGA
        { id: 110, text: 'Shomolu', place_name: 'Shomolu, Lagos, Nigeria', center: [3.3833, 6.5389] },
        { id: 111, text: 'Bariga', place_name: 'Bariga, Lagos, Nigeria', center: [3.3900, 6.5300] },
        { id: 112, text: 'Fadeyi', place_name: 'Fadeyi, Lagos, Nigeria', center: [3.3750, 6.5200] },
        { id: 113, text: 'Ilupeju', place_name: 'Ilupeju, Lagos, Nigeria', center: [3.3650, 6.5300] },
        { id: 114, text: 'Jibowu', place_name: 'Jibowu, Lagos, Nigeria', center: [3.3700, 6.5150] },
        { id: 115, text: 'Onipanu', place_name: 'Onipanu, Lagos, Nigeria', center: [3.3800, 6.5250] },
        { id: 116, text: 'Palmgrove', place_name: 'Palmgrove, Lagos, Nigeria', center: [3.3850, 6.5180] },

        // SURULERE LGA
        { id: 117, text: 'Surulere', place_name: 'Surulere, Lagos, Nigeria', center: [3.3515, 6.4969] },
        { id: 118, text: 'Aguda', place_name: 'Aguda, Surulere, Lagos, Nigeria', center: [3.3600, 6.4900] },
        { id: 119, text: 'Bode Thomas', place_name: 'Bode Thomas, Surulere, Lagos, Nigeria', center: [3.3550, 6.4950] },
        { id: 120, text: 'Iponri', place_name: 'Iponri, Surulere, Lagos, Nigeria', center: [3.3400, 6.4850] },
        { id: 121, text: 'Lawanson', place_name: 'Lawanson, Surulere, Lagos, Nigeria', center: [3.3450, 6.4900] },
        { id: 122, text: 'Masha', place_name: 'Masha, Surulere, Lagos, Nigeria', center: [3.3500, 6.4800] },
        { id: 123, text: 'Ojuelegba', place_name: 'Ojuelegba, Lagos, Nigeria', center: [3.3583, 6.5042] },

        // MAJOR ESTATES & DEVELOPMENTS
        { id: 124, text: 'Banana Island', place_name: 'Banana Island, Ikoyi, Lagos, Nigeria', center: [3.4500, 6.4400] },
        { id: 125, text: 'Magodo Phase 1', place_name: 'Magodo Phase 1, Lagos, Nigeria', center: [3.3792, 6.5789] },
        { id: 126, text: 'Magodo Phase 2', place_name: 'Magodo Phase 2, Lagos, Nigeria', center: [3.3850, 6.5750] },
        { id: 127, text: 'Victoria Garden City', place_name: 'Victoria Garden City (VGC), Ajah, Lagos, Nigeria', center: [3.5500, 6.4500] },
        { id: 128, text: 'Lekki Gardens', place_name: 'Lekki Gardens, Ajah, Lagos, Nigeria', center: [3.5600, 6.4550] },
        { id: 129, text: 'Richmond Gate Estate', place_name: 'Richmond Gate Estate, Lekki, Lagos, Nigeria', center: [3.5300, 6.4400] },
        { id: 130, text: '1004 Estate', place_name: '1004 Estate, Victoria Island, Lagos, Nigeria', center: [3.4200, 6.4350] },
        { id: 131, text: 'Dolphin Estate', place_name: 'Dolphin Estate, Lagos, Nigeria', center: [3.4000, 6.4500] },
        { id: 132, text: 'Crown Estate', place_name: 'Crown Estate, Ajah, Lagos, Nigeria', center: [3.5400, 6.4600] },

        // WATERSIDE COMMUNITIES
        { id: 133, text: 'Makoko', place_name: 'Makoko, Lagos, Nigeria', center: [3.3950, 6.4900] },
        { id: 134, text: 'Tarkwa Bay', place_name: 'Tarkwa Bay, Lagos, Nigeria', center: [3.4300, 6.4200] },

        // INDUSTRIAL AREAS
        { id: 135, text: 'Ikeja Industrial Estate', place_name: 'Ikeja Industrial Estate, Lagos, Nigeria', center: [3.3400, 6.5700] },
        { id: 136, text: 'Ilupeju Industrial Estate', place_name: 'Ilupeju Industrial Estate, Lagos, Nigeria', center: [3.3600, 6.5250] },
        { id: 137, text: 'Isolo Industrial Estate', place_name: 'Isolo Industrial Estate, Lagos, Nigeria', center: [3.3100, 6.5200] },

        
        { id: 138, text: 'Lekki', place_name: 'Lekki, Lagos, Nigeria', center: [3.4740, 6.4474] },
        { id: 139, text: 'VI', place_name: 'Victoria Island (VI), Lagos, Nigeria', center: [3.4166, 6.4302] },
        { id: 140, text: 'Surulere Lagos Mainland', place_name: 'Surulere, Lagos Mainland, Nigeria', center: [3.3515, 6.4969] }
      ];

      const filtered = mockLocations.filter(location =>
        location.text.toLowerCase().includes(query.toLowerCase()) ||
        location.place_name.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(filtered.slice(0, 10)); 
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = (place) => {
    setSelectedLocation({
      name: place.place_name,
      lat: place.center[1],
      lon: place.center[0],
    });
    setQuery(place.place_name);
    setSearchResults([]);

    checkDeliveryAvailability(place);
  };

  const checkDeliveryAvailability = (place) => {
    const deliveryAreas = [
      'lagos', 'ikeja', 'victoria island', 'lekki', 'surulere', 'yaba', 'maryland', 'gbagada', 
      'ikoyi', 'festac', 'ajah', 'magodo', 'omole', 'berger', 'ojodu', 'agege', 'mushin', 
      'oshodi', 'isolo', 'shomolu', 'bariga', 'ketu', 'anthony', 'ogudu', 'ebute-metta', 
      'apapa', 'ajegunle', 'alaba', 'ojo', 'badagry', 'ikorodu', 'epe', 'sangotedo', 
      'bogije', 'awoyaya', 'vgc', 'chevron', 'amuwo-odofin', 'satellite town', 'mile 2',
      'ikotun', 'igando', 'idimu', 'egbeda', 'abule-egba', 'ipaja', 'ayobo', 'akowonjo',
      'alakuko', 'alagbado', 'ifako', 'ijaiye', 'iju', 'ogba', 'ojokoro', 'dopemu', 
      'fagba', 'oke-odo', 'orile agege', 'kirikiri', 'tolu', 'layeni', 'orile-iganmu',
      'agbado', 'meiran', 'trade fair', 'abule-ado', 'apapa gra', 'ijora', 'liverpool',
      'ajara', 'agbara', 'okokomaiko', 'ejinrin', 'eredo', 'lekki phase 1', 'lakowe',
      'abijo', 'allen avenue', 'computer village', 'adeniyi jones', 'alausa', 'anthony village',
      'oregun', 'opebi', 'agbowa', 'ijede', 'igbogbo', 'imota', 'ebute ikorodu', 'gberigbe',
      'alapere', 'mile 12', 'oworonshoki', 'idumota', 'epetedo', 'isale-eko', 'oyingbo',
      'iddo', 'daleko', 'itire', 'odi-olowo', 'ajangbadi', 'alaba rago', 'iba', 'ijanikin',
      'shibiri', 'ajao estate', 'bolade', 'ejigbo', 'ikeja along', 'mafoluku', 'okota',
      'fadeyi', 'ilupeju', 'jibowu', 'onipanu', 'palmgrove', 'aguda', 'bode thomas',
      'iponri', 'lawanson', 'masha', 'ojuelegba', 'banana island', 'magodo phase 1',
      'magodo phase 2', 'victoria garden city', 'lekki gardens', 'richmond gate',
      '1004 estate', 'dolphin estate', 'crown estate', 'makoko', 'tarkwa bay'
    ];

    const locationName = place.place_name.toLowerCase();
    const isDeliveryAvailable = deliveryAreas.some(area => 
      locationName.includes(area) || area.includes(locationName.split(',')[0])
    );

    if (isDeliveryAvailable) {
      setShowDeliveryMessage(true);
    } else {
      setShowDeliveryMessage(false);
    }
  };

  const confirmLocationAndProceed = () => {
    if (!selectedLocation) return;

    // Dispatch location confirmation to Redux
    dispatch(confirmLocation({
      name: selectedLocation.name,
      lat: selectedLocation.lat,
      lon: selectedLocation.lon,
    }));

    // Handle pending product if exists
    if (pendingProduct) {
      dispatch(addItemCart(pendingProduct));
      localStorage.removeItem('pendingProduct');
    }

    // Redirect to homepage
    router.push('/');
  };

  const handleLocationChange = () => {
    setSelectedLocation(null);
    setQuery('');
    setShowDeliveryMessage(false);
    setSearchResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Select Your Location
          </h1>
          <p className="text-gray-600">
            Choose your delivery location to get started
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <label htmlFor="location-search" className="block text-sm font-medium text-gray-700 mb-2">
              Search for your location
            </label>
            <div className="relative">
              <input
                id="location-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter area, street, or landmark..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={selectedLocation}
              />
              {loading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedLocation && (
            <div className="mb-6">
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => selectLocation(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{result.text}</div>
                    <div className="text-sm text-gray-500">{result.place_name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Location */}
          {selectedLocation && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 mb-1">Selected Location</h3>
                    <p className="text-blue-700 text-sm">{selectedLocation.name}</p>
                  </div>
                  <button
                    onClick={handleLocationChange}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Message */}
          {showDeliveryMessage && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Great! We deliver to your area.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          {selectedLocation && (
            <button
              onClick={confirmLocationAndProceed}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Confirm Location & Continue
            </button>
          )}

          {/* No Results */}
          {query.length >= 2 && searchResults.length === 0 && !loading && !selectedLocation && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No locations found for "{query}"</p>
              <p className="text-sm text-gray-400 mt-1">Try searching with a different term</p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Can't find your location?{' '}
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Contact Support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}