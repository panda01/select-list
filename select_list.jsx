const React = require('react');
const _ = require('lodash');


const loading = require('../imgs/loader.gif');

require('../styles/select_list.less');


const selectList = React.createClass({
  getInitialState() {
    const defaultState = {
      selectedItems: [],
      itemsDisplayList: [],
      origList: [],
      currItemIdx: 0,
      currPage: 1,
      idxMap: {},
      selMap: {},
      optionsListOpen: false
    };
    if (this.props.data.length) {
      return Object.assign(defaultState, this.makeStateObjFromProps(this.props));
    }
    return defaultState;
  },
  getDefaultProps() {
    return {
      dataExtractFn: item => { return item.id; },
      pageSize: 50
    };
  },
  makeStateObjFromProps(props) {
    const newStateObj = {};
    const dataList = props.data.slice(0); // Copy the data from props
    // TODO: handle multiple items set
    const hasInitialValue = !isNaN(props.initialValueId);
    const hasMultipleInitVals = _.isArray(props.initialValueId) && props.multiple;
    const tempIdxMap = makeIdxMap(dataList);
    newStateObj.selectedItems = [];
    if (hasInitialValue) {
      const objToAddIdx = tempIdxMap[props.initialValueId];
      newStateObj.selectedItems = dataList.splice(objToAddIdx, 1);
    } else if (hasMultipleInitVals) {
      props.initialValueId.forEach(id => {
        const item = dataList.splice(id, 1)[0];
        newStateObj.selectedItems.push(item);
      });
    }
    newStateObj.origList = props.data.splice(0);
    newStateObj.selMap = makeIdxMap(newStateObj.selectedItems);
    newStateObj.itemsDisplayList = dataList;
    newStateObj.idxMap = makeIdxMap(dataList);

    return newStateObj;
  },
  // only update data if we don't have data
  componentWillReceiveProps(props) {
    const newInitialValue = props.initialValueId;
    const shouldUpdateSelected = newInitialValue && !this.props.initialValueId;
    if (!this.hasDataAlready() || shouldUpdateSelected) {
      this.setState(this.makeStateObjFromProps(props));
    }
  },

  render() {
    const currItemIdx = this.state.currItemIdx;
    const optionsMarkup = this.state.itemsDisplayList
      .slice(0, this.state.currPage * this.props.pageSize)
      .map((item, idx) => {
        const selectedLi = idx === currItemIdx; // Ew, not functional
        const classes = 'item-li' + (selectedLi ? ' selected' : '');
        return <li
          className={classes}
          onMouseEnter={this.handleMouseEnterItem}
          onMouseDown={this.handleItemAdd}
          key={item.id}
          data-key={item.id}>{item.text}</li>
      });
    optionsMarkup.unshift(<option value="" key="0"></option>);
    const selMarkup = this.state.selectedItems.map(item => {
      return (
        <li key={item.id} onMouseDown={this.handleItemRemoval} data-key={item.id}>
          {item.text}
        </li>)
    });
    const optionsClass = 'options-list ' + (this.state.optionsListOpen ? '' : 'hide');
    const ulInputMarkup = (
      <ul className="selected-options">
        {selMarkup}
        <input
          type="text"
          ref="search_input"
          className="search-input"
          placeholder={this.props.placeholder}
          onKeyDown={this.handleKeyPress}
          onFocus={this.openOptionsList}
          onBlur={this.closeOptionsList}
          onChange={this.searchList} />
        <div className="clearfix"></div>
      </ul>);
    const formControlInner = this.hasDataAlready() ? ulInputMarkup : 'Loading...';
    return(
      <div className="select-list">
        <div className="form-control" onClick={this.focusInput}>
          {formControlInner}
        </div>
        <ul className={optionsClass} onScroll={this.handleScroll}>{optionsMarkup}</ul>
      </div>
    );
  },
  hasDataAlready () {
    return this.state.itemsDisplayList.length || this.state.selectedItems.length;
  },
  handleMouseEnterItem (evt) {
    const itemIdx = this.state.idxMap[evt.target.dataset.key];
    this.setState({ currItemIdx: itemIdx });
  },
  safeCurrItemIdxSet(idx = this.state.currItemIdx) {
    const maxIdx = this.state.itemsDisplayList.length - 1;
    const minIdx = 0;
    const safeCurrIdx = Math.min(Math.max(idx, minIdx), maxIdx);
    this.setState({ currItemIdx: safeCurrIdx });
    return safeCurrIdx;
  },
  handleKeyPress (evt) {
    const inputEmpty = this.refs.search_input.value === '';
    const backspacePressed = evt.keyCode === 8;
    const downPressed = evt.keyCode === 40;
    const upPressed = evt.keyCode === 38;
    const returnPressed = evt.keyCode === 13;
    if (inputEmpty && backspacePressed) {
      this.removeItemFromSelectedByIdx(this.state.selectedItems.length - 1);
    } else if (upPressed || downPressed) {
      const dirInt = evt.keyCode - 39;
      const attemptedIdx = this.state.currItemIdx + dirInt;
      this.safeCurrItemIdxSet(attemptedIdx);
    } else if (returnPressed) {
      evt.preventDefault();
      this.addItemToSelectedByIdx(this.safeCurrItemIdxSet());
      this.clearInputResetSearch();
    }
  },
  clearInputResetSearch () {
    this.refs.search_input.value = '';
    setTimeout(() => { this.searchList(); });
  },
  handleScroll (evt) {
    const $target = evt.target;
    const needToLoadMore = $target.scrollHeight - $target.scrollTop < $target.clientHeight * 3;
    if(needToLoadMore) {
      this.setState({
        currPage: this.state.currPage + 1
      });
    }
  },
  openOptionsList () {
    this.setState({optionsListOpen: true});
  },
  closeOptionsList () { this.setState({optionsListOpen: false}); },
  searchList () {
    const searchStr = this.refs.search_input.value.toLowerCase();
    const that = this;
    const newItemsList = this.state.origList
      .filter( item => { return that.state.selMap[item.id] === undefined; })
      .filter( item => { return item.text.toLowerCase().indexOf(searchStr) !== -1; })
    this.setState({
      itemsDisplayList: newItemsList,
      idxMap: makeIdxMap(newItemsList)
    });
  },
  focusInput() { this.refs.search_input.focus(); },
  addItemToSelectedByIdx(itemIdx) {
    const newSelectedState = this.state.selectedItems.slice(0);
    const newDisplayList = this.state.itemsDisplayList.slice(0);
    const itemToBeAdded = newDisplayList.splice(itemIdx, 1)[0];
    if (this.props.multiple) {
      newSelectedState.push(itemToBeAdded);
    } else {
      const itemToPutBack = newSelectedState.splice(0, 1, itemToBeAdded)[0];
      if (itemToPutBack) {
        newDisplayList.push(itemToPutBack);
      }
    }
    this.setState({
      selectedItems: newSelectedState,
      itemsDisplayList: newDisplayList,
      idxMap: makeIdxMap(newDisplayList),
      selMap: makeIdxMap(newSelectedState)
    });
  },
  removeItemFromSelectedByIdx(itemIdx) {
    const newDisplayList = this.state.itemsDisplayList.slice(0);
    const newSelectedList = this.state.selectedItems.slice(0);
    const itemToBeAdded = newSelectedList.splice(itemIdx, 1)[0];
    newDisplayList.push(itemToBeAdded);
    this.setState({
      selectedItems: newSelectedList,
      itemsDisplayList: newDisplayList,
      idxMap: makeIdxMap(newDisplayList),
      selMap: makeIdxMap(newSelectedList)
    });
  },
  handleItemAdd(evt) {
    const itemIdx = this.state.idxMap[evt.target.dataset.key];
    this.addItemToSelectedByIdx(itemIdx);
    this.focusInput();
    this.clearInputResetSearch();
    evt.stopPropagation();
    evt.preventDefault();
  },
  handleItemRemoval(evt) {
    const itemIdx = this.state.selMap[evt.target.dataset.key];
    this.removeItemFromSelectedByIdx(itemIdx);
    this.focusInput();
    evt.stopPropagation();
    evt.preventDefault();
  },
  getValue() {
    const selectedIdMap = this.state.selectedItems
      .map(this.props.dataExtractFn)
      .join(',');
    return selectedIdMap.length ? selectedIdMap : undefined;
  },
  reset() {
    const newSelList = [];
    const newDisplayList = this.state.selectedItems.concat(this.state.itemsDisplayList);
    this.setState({
      selectedItems: newSelList,
      itemsDisplayList: newDisplayList,
      idxMap: makeIdxMap(newDisplayList),
      selMap: makeIdxMap(newSelList)
    });
  }
});

/*
 * Simply makes a map of id to idx for any array
 */
function makeIdxMap(list) {
    return _.reduce(list, (map, curr, idx) => {
      map[curr.id] = idx;
      return map;
    }, {});
}


module.exports = selectList;
