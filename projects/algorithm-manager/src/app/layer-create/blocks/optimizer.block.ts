import { CustomBlock } from "ngx-blockly";
import * as Blockly from 'blockly';

// METRICS
export class MetricsBlock extends CustomBlock {
    oMatrixCnt: number;

    constructor() {
        super('metrics');
        this.class = MetricsBlock;
        this.oMatrixCnt = 1;
    }

    public defineBlock() {
        this.block.setInputsInline(true);
        this.block.appendDummyInput()
            .appendField('Metrics');

        this.block.appendDummyInput()
            .appendField('개수: ')
            .appendField(new Blockly.FieldNumber(1, 1, 5, 1,
                // block 수정 callback
                (value: number) => {
                    this.updateDropdowns(value);
                }
            ), 'num_matrices');

        this.updateDropdowns(1);
        this.block.setPreviousStatement(true, 'metrics');
        this.block.setColour(230);
        this.block.setTooltip('Select metrics');
    }
    public getNewFieldDropdown() {
        return new Blockly.FieldDropdown([
            ['MSE', 'mse'],
            ['MAE', 'mae'],
            ['Binary Accuracy(분류)', 'binary_accuracy'],
            ['Categorical Accuracy(분류)', 'categorical_accuracy'],
        ]);
    }
    private updateDropdowns(pNum: number) {
        // 기존 Matrix Cnt 보다 작으면 뒤쪽에서 삭제.
        if (pNum < this.oMatrixCnt) {
            for (let sIndex = pNum + 1; sIndex <= this.oMatrixCnt; sIndex++) {
                this.block.removeInput('matrix' + sIndex)
            }
            // 기존 Matrix Cnt 보다 크면 그만큼 추가
        } else if (pNum > this.oMatrixCnt) {
            for (let sIndex = this.oMatrixCnt + 1; sIndex <= pNum; sIndex++) {
                let sField = this.getNewFieldDropdown()
                this.block.appendDummyInput('matrix' + sIndex)
                    .appendField('Matrix ' + sIndex)
                    .appendField(sField, 'matrix' + sIndex);
            }
            // 동일할 때는 1개일 때 값이 없는 경우만 체크함.
        } else if (pNum == 1) {
            if (!this.block.getInput('matrix1')) {
                let sField = this.getNewFieldDropdown()
                this.block.appendDummyInput('matrix1')
                    .appendField('Matrix 1')
                    .appendField(sField, 'matrix1');
            }
        }
        // 변경된 평가지표 개수 반영
        this.oMatrixCnt = pNum;
    }

    public toPythonCode(block: Blockly.Block) {
        const sNumMatrices = this.block.getFieldValue('num_matrices');
        const sMetrics = [];
        for (let i = 1; i <= sNumMatrices; i++) {
            sMetrics.push(this.block.getFieldValue('matrix' + i));
        }
        return `['${sMetrics.join("', '")}']`;
    }
}


// LOSS
export class LossClassBlock extends CustomBlock {
    constructor() {
        super('loss_classification');
        this.class = LossClassBlock;
    }

    defineBlock() {
        this.block.appendDummyInput()
            .appendField('Loss(분류)')
            .appendField(new Blockly.FieldDropdown([
                ['binary_crossentropy', 'binary_crossentropy'],
                ['categorical_crossentropy', 'categorical_crossentropy'],
            ], (value: string) => {
                this.updateDropdowns(value)
            }), 'loss');

        this.block.setColour(120);
        this.block.setTooltip('select loss value');
        this.block.setHelpUrl('');
        this.block.setPreviousStatement(true, 'loss');
    }
    updateDropdowns(pValue: string) {
        let sParentBlock = this.block.getParent();
        while (sParentBlock && sParentBlock.type !== 'layer_dense') {
            sParentBlock = sParentBlock.getParent();
        }
        if (sParentBlock) {
            let sDenseUnit = sParentBlock.getFieldValue('dense_units');
            if (sDenseUnit == 1) {
                this.block.previousConnection.disconnect();
                throw Error('마지막 dense layer의 units값을 분류하려는 클래스 갯수로 설정하고 연결하세요');
            }
        }
    }
    toPythonCode(block: Blockly.Block) {
        return "";
    }
    public onChange(event: any) {
        if (event.type === 'move' && event.newParentId) {
            this.updateDropdowns(this.block.getFieldValue('loss'));
        }
    }
}

export class LossRegBlock extends CustomBlock {
    constructor() {
        super('loss_regression');
        this.class = LossRegBlock;
    }

    defineBlock() {
        this.block.appendDummyInput()
            .appendField('Loss(회귀)')
            .appendField(new Blockly.FieldDropdown([
                ['mean_squared_error', 'mean_squared_error'],
                ['mean_absolute_error', 'mean_absolute_error'],
                ['mean_absolute_percentage_error', 'mean_absolute_percentage_error'],
            ], (value: string) => {
                this.updateDropdowns(value)
            }), 'loss');
        this.block.setColour(120);
        this.block.setTooltip('select loss value');
        this.block.setHelpUrl('');
        this.block.setPreviousStatement(true, 'loss');
    }
    updateDropdowns(pValue: string) {
        let sParentBlock = this.block.getParent();
        while (sParentBlock && sParentBlock.type !== 'layer_dense') {
            sParentBlock = sParentBlock.getParent();
        }
        if (sParentBlock) {
            let sDenseUnit = sParentBlock.getFieldValue('dense_units')
            if (sDenseUnit != 1) {
                this.block.previousConnection.disconnect();
                throw Error('회귀 모델은 마지막 dense layer의 units값을 1로 설정해주세요');
            }
        }
    }
    public onChange(event: any) {
        if (event.type === 'move' && event.newParentId) {
            this.updateDropdowns(this.block.getFieldValue('loss'));
        }
    }
    toPythonCode(block: Blockly.Block) {
        return "";
    }
}

// OPTIMIZER 
export class AdamOptimizerBlock extends CustomBlock {
    constructor() {
        super('optimizer_adam');
        this.class = AdamOptimizerBlock;
    }

    public defineBlock() {
        this.block.appendDummyInput()
            .appendField('Adam Optimizer');

        this.block.appendDummyInput()
            .appendField('learning rate')
            .appendField(new Blockly.FieldNumber(0.001, 0.0001, 0.9999), 'learning_rate'); // default, min, max

        this.block.appendDummyInput()
            .appendField("beta 1")
            .appendField(new Blockly.FieldNumber(0.9, 0, 0.999), 'beta1'); // default, min, max

        this.block.appendDummyInput()
            .appendField("beta 2")
            .appendField(new Blockly.FieldNumber(0.999, 0, 0.99999), 'beta2'); // default, min, max

        this.block.appendDummyInput()
            .appendField("epsilon")
            .appendField(new Blockly.FieldNumber(1e-7, 0, 0.9999), 'epsilon'); // default, min, max

        this.block.setColour(260);
        this.block.setPreviousStatement(true, 'optimizer');

        this.block.setTooltip("Adam optimizer");
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/Adam');
    }

    public toPythonCode(block: Blockly.Block): string | any[] {

        const sLearningRate = block.getFieldValue("learning_rate") || "0.001";
        const sBeta1 = block.getFieldValue("beta1") || "0.9";
        const sBeta2 = block.getFieldValue("beta2") || "0.999";
        const sEpsilon = block.getFieldValue("epsilon") || "1e-7";

        block.setFieldValue(sLearningRate.toString(), "learning_rate");
        block.setFieldValue(sBeta1.toString(), "beta1");
        block.setFieldValue(sBeta2.toString(), "beta2");
        block.setFieldValue(sEpsilon.toString(), "epsilon");

        return `tf.keras.optimizers.Adam(lr=${sLearningRate}, beta_1=${sBeta1}, beta_2=${sBeta2}, epsilon=${sEpsilon})`;
    }
}

export class AdagradOptimizerBlock extends CustomBlock {
    constructor() {
        super('optimizer_adagrad');
        this.class = AdagradOptimizerBlock;
    }

    defineBlock() {
        this.block.appendDummyInput()
            .appendField('Adagrad Optimizer');

        this.block.appendDummyInput()
            .appendField('learning rate')
            .appendField(new Blockly.FieldNumber(0.01, 0.0001, 0.9999), 'learning_rate'); // default, min, max

        this.block.setColour(260);
        this.block.setPreviousStatement(true, 'optimizer');
        this.block.setTooltip('Adagrad optimizer');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/legacy/Adagrad');
    }

    toPythonCode(block: any): string | any[] {
        const sLearningRate = block.getFieldValue("learning_rate") || "0.001";
        block.setFieldValue(sLearningRate.toString(), "learning_rate");
        return `tf.keras.optimizers.Adadelta(lr=${sLearningRate})`;
    }
}


export class RMSPropOptimizerBlock extends CustomBlock {
    constructor() {
        super('optimizer_rmsprop');
        this.class = RMSPropOptimizerBlock;
    }

    defineBlock() {
        this.block.appendDummyInput()
            .appendField('RMSProp Optimizer');

        this.block.appendDummyInput()
            .appendField('learning rate')
            .appendField(new Blockly.FieldNumber(0.01, 0.0001, 0.9999), 'learning_rate'); // default, min, max

        this.block.setColour(260);
        this.block.setPreviousStatement(true, 'optimizer');
        this.block.setTooltip('RMSProp optimizer');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/legacy/RMSProp');
    }

    toPythonCode(block: any): string | any[] {
        const sLearningRate = block.getFieldValue("learning_rate") || "0.001";
        block.setFieldValue(sLearningRate.toString(), "learning_rate");
        return `tf.keras.optimizers.RMSprop(lr=${sLearningRate})`;
    }
}


export class SgdOptimizerBlock extends CustomBlock {
    constructor() {
        super('optimizer_sgd');
        this.class = SgdOptimizerBlock;
    }

    public defineBlock() {
        this.block.appendDummyInput()
            .appendField('SGD Optimizer');

        this.block.appendDummyInput()
            .appendField('learning rate')
            .appendField(new Blockly.FieldNumber(0.01, 0.0001, 0.9999), 'learning_rate'); // default, min, max

        this.block.appendDummyInput()
            .appendField("momentum")
            .appendField(new Blockly.FieldNumber(0.0, 0.0, 0.999), 'momentum'); // default, min, max

        this.block.appendDummyInput()
            .appendField("decay")
            .appendField(new Blockly.FieldNumber(0.0, 0.0, 0.999), 'decay'); // default, min, max

        this.block.setColour(260);
        this.block.setPreviousStatement(true, 'optimizer');

        this.block.setTooltip("SGD optimizer");
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/legacy/SGD');
    }

    public toPythonCode(block: Blockly.Block): string | any[] {

        const sLearningRate = block.getFieldValue("learning_rate") || "0.01";
        const sMomentum = block.getFieldValue("momentum") || "0.0";
        const sDecay = block.getFieldValue("decay") || "0.0";

        block.setFieldValue(sLearningRate.toString(), "learning_rate");
        block.setFieldValue(sMomentum.toString(), "momentum");
        block.setFieldValue(sDecay.toString(), "decay");

        return `tf.keras.optimizers.SGD(lr=${sLearningRate}, momentum=${sMomentum}, decay=${sDecay})`;
    }
}