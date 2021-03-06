import { combineReducers } from 'redux';
import getModuleStatusReducer from '../../lib/getModuleStatusReducer';

/* istanbul ignore next: unnecessary to test getModuleStatusReducer */
export default function getCallMonitorReducer(types) {
  return combineReducers({
    status: getModuleStatusReducer(types),
  });
}
