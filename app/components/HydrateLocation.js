'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setLocationFromStorage } from '../store/locationSlice';

const HydrateLocation = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    
    dispatch(setLocationFromStorage(false));
  }, [dispatch]);

  return null;
};

export default HydrateLocation;
