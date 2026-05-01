import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { canRequestReview } from './eligibility';

const STORAGE_KEYS = {
  APP_OPENS: 'loanbee_review_app_opens_v1',
  USEFUL_ACTIONS: 'loanbee_review_useful_actions_v1',
  HAS_REVIEWED: 'loanbee_review_has_reviewed_v1',
  LAST_REVIEW_REQUEST: 'loanbee_review_last_request_v1',
} as const;

const readNumber = async (key: string) => {
  const raw = await AsyncStorage.getItem(key);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const increment = async (key: string) => {
  const value = await readNumber(key);
  await AsyncStorage.setItem(key, String(value + 1));
};

export const recordReviewAppOpen = async () => {
  await increment(STORAGE_KEYS.APP_OPENS);
};

export const recordReviewUsefulAction = async () => {
  await increment(STORAGE_KEYS.USEFUL_ACTIONS);
};

export const requestStoreReviewIfEligible = async () => {
  try {
    const [appOpens, usefulActions, hasReviewedRaw, lastRequestAt] = await Promise.all([
      readNumber(STORAGE_KEYS.APP_OPENS),
      readNumber(STORAGE_KEYS.USEFUL_ACTIONS),
      AsyncStorage.getItem(STORAGE_KEYS.HAS_REVIEWED),
      readNumber(STORAGE_KEYS.LAST_REVIEW_REQUEST),
    ]);
    const hasStoreAction = await StoreReview.hasAction();

    if (!canRequestReview({
      appOpens,
      usefulActions,
      hasReviewed: hasReviewedRaw === 'true',
      lastRequestAt,
      now: Date.now(),
      hasStoreAction,
    })) {
      return false;
    }

    await StoreReview.requestReview();
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_REVIEW_REQUEST, String(Date.now()));
    return true;
  } catch {
    return false;
  }
};

export const useStoreReview = () => {
  const recordUsefulAction = useCallback(() => recordReviewUsefulAction(), []);
  const requestReview = useCallback(() => requestStoreReviewIfEligible(), []);

  return { recordUsefulAction, requestReview };
};
