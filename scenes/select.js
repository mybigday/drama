const _ = require('lodash');
const Scene = require('./basic');
const fs = require('fs');
const path = require('path');
const gm = require('gm');

const TYPE = 'BOT_SELECT';
const SUBSELECT_KEY = 'SUBSELECT';
const SUBSELECT_REG_EXP = new RegExp(`^${SUBSELECT_KEY}`);
const SEPARATE_SUBSELECT_EXP = /\[\d+\]/g;

class Select extends Scene {
  constructor(drama, config) {
    super(drama, config, 'postback');
    this.sceneType = TYPE;
    this.imageFolder = path.join(drama.mediaFolder, config.key);
    if (config.property.selectForm === 'image') {
      this.generateImageFile(config.property);
    }
  }
  async generateParameter(context, property) {
    let currentStage = '';
    if (
      _.get(context, 'state.trigger.force_reset') !== true &&
      _.get(context, 'state.last_scene.key') === this.key
    ) {
      currentStage = _.get(context, 'state.current_scene.runtime_data.select_stage') || '';
    }
    let currentProperty = property;
    if (_.isString(currentStage) && currentStage !== '') {
      const currentStageList = currentStage.match(SEPARATE_SUBSELECT_EXP);
      const currentPropertyPath = `selection_list.${_.join(currentStageList, '.selection_list.')}`;
      currentProperty = _.get(property, currentPropertyPath);
    }

    const parameter = [];
    // Must replace text
    parameter.push(currentProperty.text || 'Text not set');
    switch (currentProperty.selectForm) {
      case 'image': {
        if (!fs.existsSync(this.imageFolder)) {
          fs.mkdirSync(this.imageFolder);
        }
        const imageFilePath = path.join(this.imageFolder, `${currentStage || 'MAIN'}.png`);
        if (!fs.existsSync(imageFilePath)) {

        }
        break;
      }
      case 'carousel': {
        parameter.push(
          _(currentProperty.selection_list).map((selection, index) => ({
            imageUrl: selection.imageUrl,
            action: this.generateAction(_.defaults(
              (_.isArray(selection.selection_list) && selection.selection_list.length > 0) && {
                key: this.generateSelectionKey(currentStage, index),
              },
              selection
            )),
          }))
          .take(10)
          .value()
        );
        break;
      }
      case 'two-dimensional':
        parameter.push(
          _(currentProperty.selection_list).map((selection, index) => ({
            thumbnailImageUrl: selection.headerImageUrl,
            title: selection.title,
            text: selection.text || 'Text not set',
            actions: _(selection.selection_list).map((subSelection, subIndex) => (
              (_.isArray(subSelection.selection_list) && subSelection.selection_list.length > 0) ?
              _.defaults({
                key: this.generateSelectionKey(currentStage, index, subIndex),
              }, subSelection)
              :
              subSelection
            ))
            .map(this.generateAction.bind(this))
            .take(3)
            .value(),
          }))
          .take(10)
          .value()
        );
        break;
      default: {
        parameter.push(
          _.omitBy({
            thumbnailImageUrl: currentProperty.headerImageUrl,
            title: currentProperty.title,
            text: currentProperty.text || 'Text not set',
            actions: _(currentProperty.selection_list).map((selection, index) => (
              (_.isArray(selection.selection_list) && selection.selection_list.length > 0) ?
              _.defaults({
                key: this.generateSelectionKey(currentStage, index),
              }, selection)
              :
              selection
            )).map(this.generateAction.bind(this))
            .take(4)
            .value(),
          }, _.isUndefined)
        );
      }
    }
    return Promise.resolve(parameter);
  }
  generateSelectionKey(currentStage, index, subIndex) {
    let result = `${SUBSELECT_KEY}${currentStage}[${index}]`;
    if (subIndex) {
      result = `${result}[subIndex]`;
    }
    // result = result.replace(`${SUBSELECT_KEY}.`, SUBSELECT_KEY);
    return result;
  }
  async generateImageMap(currentStage, props) {
    const property = _.defaults(props, {
      colorList: [{
        backgroundColor: '#333333',
        fontColor: '#CCCCCC',
      }, {
        backgroundColor: '#555555',
        fontColor: '#CCCCCC',
      }],
      arrangement: 'list',
    });
    if (!fs.existsSync(this.imageFolder)) {
      fs.mkdirSync(this.imageFolder);
    }
    if (_.isArray(property.selection_list)) {
      const quantity = property.selection_list.length;
      if (quantity > 0 && quantity <= 24) {
        let width = 1040;
        let height = 1040;
        let itemPerLine = 1;
        if (property.arrangement === 'grid') {
          if (quantity <= 4) {
            itemPerLine = 2;
          } else if (quantity <= 6) {
            itemPerLine = 2;
            height = (width / 2) * 3;
          } else if (quantity <= 9) {
            itemPerLine = 3;
          } else if (quantity <= 12) {
            itemPerLine = 3;
            height = (width / 3) * 4;
          } else if (quantity <= 16) {
            itemPerLine = 4;
          } else if (quantity <= 20) {
            itemPerLine = 4;
            height = (width / 4) * 5;
          } else if (quantity <= 24) {
            itemPerLine = 4;
            height = (width / 2) * 3;
          }
        } else {
          if (quantity > 10) {
            height = (width / 2) * 3;
          }
        }
        const imageFile = gm(1040, 1040, property.backgroundColor)
                          .fill(property.fontColor)
                          .stroke(property.fontColor, 3)
                          .font(path.join(__dirname, '..', 'font.ttf'));
        const itemHeight = height / _.ceil(quantity / itemPerLine);
        let count = 0;
        _.each(property.selection_list, (action, index) => {
          const fontSize = Math.min(
                            (height / actionList.length) * 0.7,
                            width / (action.title.length + 4)
                          );
          const offset = (height + itemHeight) / 2;

          imageFile
          .fontSize(`${fontSize}px`)
          .drawText(0, itemHeight * (index + 1) - offset, action.title, 'Center')
          .drawLine(0, itemHeight * (index + 1), width, itemHeight * (index + 1))
        });
      } else {
        throw new Error('Select must have at lease one selection and small then 24 items.');
      }
    } else {
      throw new Error('Not support dynamic property when use imagemap select.');
    }




    // grid
    // 2 x 2: 1-4
    // 2 x 3: 5-6
    // 3 x 3: 7-9
    // 3 x 4: 10-12
    // 4 x 4: 13-16
    // 4 x 5: 17-20
    // 4 x 6: 21-24
    // list
    // 1 x 1: 1-10
    // 1 x 1.5: 11-24
    // 240px, 300px, 460px, 700px, 1040px

    const width = 1040;
    const height = 1040;
    const image1040FilePath = path.join(this.imageFolder, currentStage, '1040.png');
    // if (!fs.existsSync(image1040FilePath)) {
      const imageFile = gm(1040, 1040, backgroundColor)
                        .fill(fontColor)
                        .stroke(fontColor, 3)
                        .font(path.join(__dirname, '..', 'font.ttf'));
      const itemHeight = height / actionList.length;
      // const maxCharLength = _.maxBy(actionList, (action) => (action.title.length)).title.length;
      _.each(actionList, (action, index) => {
        const fontSize = Math.min(
                          (height / actionList.length) * 0.7,
                          width / (action.title.length + 4)
                        );
        const offset = (height + itemHeight) / 2;

        imageFile
        .fontSize(`${fontSize}px`)
        .drawText(0, itemHeight * (index + 1) - offset, action.title, 'Center')
        .drawLine(0, itemHeight * (index + 1), width, itemHeight * (index + 1))
      });
      await this.saveImageFile(imageFile, currentStage, 1040);
      await this.resizeImage(image1040FilePath, 700);
      await this.resizeImage(image1040FilePath, 460);
      await this.resizeImage(image1040FilePath, 300);
      await this.resizeImage(image1040FilePath, 240);
    // }
  }
  async saveImageFile(image, currentStage, width) {
    return new Promise((resolve, reject) => {
      if (width) {
        image.resize(width);
      }
      const imageFilePath = path.join(this.imageFolder, currentStage, `${width}.png`);
      console.log('imageFilePath: ', imageFilePath);
      image.write(imageFilePath, (err) => {
        if (err) {
          console.log('Err:', err);
          return reject(err);
        }
        resolve();
      });
    });
  }
  async resizeImage(filePath, width) {
    return new Promise((resolve, reject) => {
      const imageFilePath = path.join(path.dirname(filePath), `${width}.png`);
      gm(filePath).resize(width).write(imageFilePath, (err) => {
        if (err) {
          console.log('Err:', err);
          return reject(err);
        }
        resolve();
      });
    });
  }
  async getTriggerHandler(context, property) {
    switch (property.selectForm) {
      case 'image':
        return Promise.resolve('replyImagemap');
      case 'carousel':
        return Promise.resolve('replyImageCarouselTemplate');
      case 'two-dimensional':
        return Promise.resolve('replyCarouselTemplate');
      default:
        return Promise.resolve('replyButtonTemplate');
    }
  }
  async getMulticastHandler(context, property) {
    switch (property.selectForm) {
      case 'image':
        return Promise.resolve('multicastImagemap');
      case 'carousel':
        return Promise.resolve('multicastImageCarouselTemplate');
      case 'two-dimensional':
        return Promise.resolve('multicastCarouselTemplate');
      default:
        return Promise.resolve('multicastButtonTemplate');
    }
  }
  async callback(context) {
    if (!super.callback(context)) {
      const paramsData = this.depackageSceneParams(context);
      let result = paramsData.postback_data || 'Recived selection';
      if (SUBSELECT_REG_EXP.test(result)) {
        this.setRuntimeData(context, {
          select_stage: result.replace(SUBSELECT_KEY, ''),
        });
        return await this.conclusion(context, {
          nextSceneId: this.key,
        });
      }
      const onSelectedHandler = this.config.onSelected;
      if (onSelectedHandler) {
        result = await onSelectedHandler(context, result);
      }
      return await this.conclusion(context, result);
    }
    return false;
  }
}
Select.type = TYPE;

module.exports = Select;