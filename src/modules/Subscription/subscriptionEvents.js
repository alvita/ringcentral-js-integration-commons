import KeyValueMap from 'data-types/key-value-map';
import subscriptionStatus from './subscriptionStatus';


const eventDefinition = {
  ...subscriptionStatus,
  notification: 'NOTIFICATION',
  statusChange: 'STATUS_CHANGE',
  error: 'ERROR',
  ready: 'READY',
};

export default new KeyValueMap(eventDefinition);