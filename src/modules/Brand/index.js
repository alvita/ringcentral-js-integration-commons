import RcModule from '../../lib/RcModule';
import SymbolMap from 'data-types/symbol-map';

const symbols = new SymbolMap([
  'reducer',
  'data',
]);

export default class Brand extends RcModule {
  constructor(options) {
    super(options);
    const {
      id,
      name,
    } = options;
    this[symbols.data] = {
      id,
      name,
    };
    this[symbols.reducer] = () => this[symbols.data];
  }
  get reducer() {
    return this[symbols.reducer];
  }
  get id() {
    return this.state.id;
  }
  get name() {
    return this.state.name;
  }
}
