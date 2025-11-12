import { CustomBlock } from "ngx-blockly";
import * as Blockly from 'blockly';

// Input Layer
export class InputBlock extends CustomBlock {
    constructor() {
        super('layer_input');
        this.class = InputBlock;
    }

    defineBlock() {
        this.block.appendDummyInput()
            .appendField('Input layer');

        this.block.appendDummyInput()
            .appendField(new Blockly.FieldTextInput('input_shape'), 'input_shape');

        this.block.setInputsInline(true);
        // 다음 연결 정의
        this.block.setNextStatement(true, [
            'layer_dense',
            'layer_conv2d',
            'layer_flatten',
            'layer_dropout'
        ]);
        this.block.setColour(40);
        this.block.setTooltip('Layer to be used as an entry point into a Network (a graph of layers).');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/layers/InputLayer');
    }

    toPythonCode(block: Blockly.Block) {
        const sInputShape = block.getFieldValue('input_shape');
        return `model.add(tf.keras.layers.Input(shape=(${sInputShape},)))\n`;
    }
}

export class DenseBlock extends CustomBlock {
    constructor() {
        super('layer_dense');
        this.class = DenseBlock;
    }

    defineBlock() {
        this.block.setInputsInline(true);
        this.block.appendDummyInput()
            .appendField('Dense layer')
            .appendField('units')
            .appendField(new Blockly.FieldNumber(16), 'dense_units')
            .appendField('activation')
            .appendField(new Blockly.FieldDropdown([
                ['None', 'None'],
                ['ReLU', "'relu'"],
                ['Sigmoid', "'sigmoid'"],
                ['Softmax', "'softmax'"],
                ['Tanh', "'tanh'"]
            ]), 'dense_activation');
        // 이전 연결 정의
        this.block.setPreviousStatement(true, ['layer_dense', 'layer_input', 'layer_conv2d']);
        // 다음 연결 정의
        this.block.setNextStatement(true, [
            'layer_dense',
            'layer_conv2d',
            'layer_flatten',
            'layer_dropout']);
        this.block.setColour(80);
        this.block.setTooltip('Dense layer for the neural network');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/layers/Dense');
    }

    toPythonCode(block: Blockly.Block) {
        const sUnits = block.getFieldValue('dense_units');
        const sActivation = block.getFieldValue('dense_activation');
        return `model.add(tf.keras.layers.Dense(units=${sUnits}, activation=${sActivation}))\n`;
    }
}


export class Conv2DBlock extends CustomBlock {
    constructor() {
        super('layer_conv2d');
        this.class = Conv2DBlock;
    }

    defineBlock() {
        this.block.appendDummyInput()
            .appendField('Conv2D layer')
            .appendField('filters')
            .appendField(new Blockly.FieldNumber(1), 'conv2d_filters')
            .appendField('kernel_size')
            .appendField(new Blockly.FieldTextInput('3'), 'conv2d_kernel_size')
            .appendField('activation')
            .appendField(new Blockly.FieldDropdown([
                ['None', 'None'],
                ['ReLU', 'ReLU'],
                ['Sigmoid', 'Sigmoid'],
                ['Softmax', 'Softmax'],
                ['Tanh', 'Tanh']
            ]), 'conv2d_activation');
        // 이전 연결 정의
        this.block.setPreviousStatement(true, ['layer_dense', 'layer_input', 'layer_conv2d']);
        // 다음 연결 정의
        this.block.setNextStatement(true, [
            'layer_dense',
            'layer_conv2d',
            'layer_flatten',
            'layer_dropout']);
        this.block.setColour(120);
        this.block.setTooltip('Conv2D layer for the neural network');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/layers/Conv2D');
    }

    toPythonCode(block: Blockly.Block) {
        const sFilters = block.getFieldValue('conv2d_filters');
        const sKernelSize = block.getFieldValue('conv2d_kernel_size');
        let sActivation = block.getFieldValue('activation');
        sActivation === 'None' ? sActivation : "'" + sActivation + "'"
        return `model.add(tf.keras.layers.Conv2D(${sFilters}, (${sKernelSize}, ${sKernelSize}), activation=${sActivation}))\n`;
    }
}

export class MaxPooling2DBlock extends CustomBlock {
    constructor() {
        super('layer_maxpool2d');
        this.class = MaxPooling2DBlock;
    }
    public defineBlock() {
        this.block.setInputsInline(true);
        this.block.appendDummyInput()
            .appendField('MaxPooling2D');

        this.block.appendDummyInput()
            .appendField('pool_size')
            .appendField(new Blockly.FieldDropdown([
                ['2x2', '[2,2]'],
                ['3x3', '[3,3]'],
                ['4x4', '[4,4]'],
                ['5x5', '[5,5]']
            ]), 'pool_size');

        this.block.appendDummyInput()
            .appendField('strides')
            .appendField(new Blockly.FieldDropdown([
                ['1x1', '[1,1]'],
                ['2x2', '[2,2]'],
                ['3x3', '[3,3]']
            ]), 'strides');

        this.block.appendDummyInput()
            .appendField('padding')
            .appendField(new Blockly.FieldDropdown([
                ['Valid', '"valid"'],
                ['Same', '"same"']
            ]), 'padding');

        // 이전 연결 정의
        this.block.setPreviousStatement(true, ['layer_conv2d']);
        // 다음 연결 정의
        this.block.setNextStatement(true, [
            'layer_dense',
            'layer_conv2d',
            'layer_flatten',
            'layer_dropout'
        ]);

        this.block.setColour(160);
        this.block.setTooltip('Max pooling layer');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/layers/MaxPool2D');

    }

    public toPythonCode(block: Blockly.Block): string {
        const sPoolSize = block.getFieldValue('pool_size');
        const sStrides = block.getFieldValue('strides');
        const sPadding = block.getFieldValue('padding');
        return `model.add(tf.keras.layers.MaxPooling2D(pool_size=${sPoolSize}, strides=${sStrides}, padding=${sPadding}))\n`;
    }

}

// flatten block
export class FlattenBlock extends CustomBlock {
    constructor() {
        super('layer_flatten');
        this.class = FlattenBlock;
    }

    defineBlock() {
        this.block.appendDummyInput()
            .appendField('Flatten')
        this.block.setTooltip('Flatten layer');
        this.block.setColour(200);
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/layers/Flatten');
        // 이전 연결 정의
        this.block.setPreviousStatement(true, ['layer_dense', 'layer_input', 'layer_conv2d', 'layer_maxpool2d']);
        // 다음 연결 정의
        this.block.setNextStatement(true, [
            'layer_dense',
            'layer_dropout'
        ]);
    }

    toPythonCode(block: Blockly.Block) {
        return `model.add(tf.keras.layers.Flatten())\n`;
    }
}

export class DropoutBlock extends CustomBlock {
    constructor() {
        super('layer_dropout');
        this.class = DropoutBlock;
    }

    defineBlock() {
        this.block.setInputsInline(true);
        this.block.appendDummyInput()
            .appendField('Dropout');
        this.block.appendDummyInput()
            .appendField('rate')
            .appendField(new Blockly.FieldNumber(0.5, 0, 1, 0.01), 'rate');

        // 이전 연결 정의
        this.block.setPreviousStatement(true, ['layer_dense', 'layer_input', 'layer_conv2d', 'layer_maxpool2d']);
        // 다음 연결 정의
        this.block.setNextStatement(true, ['layer_dense', 'layer_conv2d', 'layer_flatten', 'layer_dropout']);
        this.block.setColour(240);
        this.block.setTooltip('Dropout layer');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/layers/Dropout');
    }

    toPythonCode(block: Blockly.Block): string {
        const sRate = this.block.getFieldValue('rate');
        return `model.add(tf.keras.layers.Dropout(rate=${sRate}))\n`;
    }
}
