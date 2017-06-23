import { combineReducers } from 'redux';
import getModuleStatusReducer from '../../lib/getModuleStatusReducer';

export default function getAnalyticsReducer(types) {
  return combineReducers({
    status: getModuleStatusReducer(types),
  });
}
