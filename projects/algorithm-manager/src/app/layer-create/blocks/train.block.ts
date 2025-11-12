import { CustomBlock } from "ngx-blockly";
import * as Blockly from 'blockly';

export class CompileModelBlock extends CustomBlock {
    constructor() {
        super('model_compile');
        this.class = CompileModelBlock;
    }
    public defineBlock() {
        this.block.appendDummyInput()
            .appendField('Compile');
        // setCheck 에 넣은 이름으로 입력 블럭에서 this.block.setPreviousStatement로 정의해야함.
        this.block.appendStatementInput('loss')
            .setCheck('loss')
            .appendField('Loss');

        this.block.appendStatementInput('optimizer')
            .setCheck('optimizer')
            .appendField('Optimizer');

        this.block.appendStatementInput('metrics')
            .setCheck('metrics')
            .appendField('Metrics');

        // 이전 연결 정의
        this.block.setPreviousStatement(true, ['layer_dense', 'layer_flatten', 'layer_dropout']);
        // 다음 연결 정의
        this.block.setNextStatement(true, 'model_fit');
        this.block.setColour(320);
        this.block.setTooltip('Compile Model');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/Model#compile');

    }
    public toPythonCode(block: Blockly.Block): string {
        let sLoss = null, sOptimizer = null, sMetrics = null, sModelType = null;

        this.block.getChildren(false).forEach((sBlock: any) => {
            let sBlockType = sBlock.type
            if (sBlockType.includes('loss')) {
                sLoss = sBlock.getFieldValue('loss');
                if (sBlockType === 'loss_classification') {
                    sModelType = 'class';
                } else if (sBlockType === 'loss_regression') {
                    sModelType = 'reg';
                }
            } else if (sBlockType === 'metrics') {
                sMetrics = sBlock.blockInstance.toPythonCode(sBlock);
            } else if (sBlockType.includes('optimizer')) {
                sOptimizer = sBlock.blockInstance.toPythonCode(sBlock);
            }
        })

        let code = `model.compile(\n`
        if (sLoss) {
            if (sModelType === 'reg') {
                code += `#reg_model\n`
                code += `#회귀모델 이전의 마지막 Dense 층의 activation은 relu를 추천합니다.\n`
                // 분류 모델 클래스 표기
            } else if (sModelType === 'class') {
                let sParentBlock = this.block.getParent();
                while (sParentBlock && sParentBlock.type !== 'layer_dense') {
                    sParentBlock = sParentBlock.getParent();
                }
                let sClassSize = sParentBlock ? sParentBlock.getFieldValue('dense_units') : 2;
                code += `#분류모델 이전의 마지막 Dense 층의 activation은 softmax, sigmoid를 추천합니다.\n`
                code += `#class_model(classCnt=${sClassSize})\n`
            }
            code += `loss = '${sLoss}',\n`
        }
        if (sOptimizer)
            code += `optimizer = ${sOptimizer},\n`
        if (sMetrics)
            code += `metrics = ${sMetrics},\n`
        code += ')\n'

        return code;
    }

    public onChange(event: any) {
        if (event.type === 'move' && event.newParentId) {
            // 앞에 들어오는 모델 validation
            let sPreviousBlock: any = this.block.getPreviousBlock();
            if (sPreviousBlock) {
                let sInputBlock: any = this.block.getRootBlock();
                if (sInputBlock.type !== 'layer_input') {
                    this.block.previousConnection.disconnect();
                    throw Error('최상단 레이어를 Input Layer로 설정하세요.');
                }
            }
        }
    }
}


export class FitModelBlock extends CustomBlock {
    constructor() {
        super('model_fit');
        this.class = FitModelBlock;
    }

    public defineBlock() {
        this.block.appendDummyInput()
            .appendField('Model Fit');

        this.block.appendDummyInput()
            .appendField('Epochs')
            .appendField(new Blockly.FieldNumber(10, 1), 'epochs');

        this.block.appendDummyInput()
            .appendField('Batch Size')
            .appendField(new Blockly.FieldNumber(32, 1), 'batch_size');

        this.block.setInputsInline(true);
        // 이전 연결 정의
        this.block.setPreviousStatement(true)
        this.block.setNextStatement(false);

        this.block.setColour(380);
        this.block.setTooltip('Fit Model');
        this.block.setHelpUrl('https://www.tensorflow.org/api_docs/python/tf/keras/Model#fit');
    }

    public toPythonCode(block: Blockly.Block): string {
        const sEpochs = block.getFieldValue('epochs') || 10;
        const sBatchSize = block.getFieldValue('batch_size') || 32;

        return `history = model.fit(x, y, epochs=${sEpochs}, batch_size=${sBatchSize}, validation_data=(x_test, y_test))\n`;
    }

    public onChange(event: any) {
        if (event.type === 'move' && event.newParentId) {
            let sPreviousBlock: any = this.block.getPreviousBlock()
            if (sPreviousBlock && sPreviousBlock.type !== 'model_compile') {
                this.block.previousConnection.disconnect();
                throw Error('model compile 블록 이후에 model fit이 가능합니다.');
            }

            if (sPreviousBlock) {
                let sPrviousCode = sPreviousBlock.blockInstance.toPythonCode(sPreviousBlock);
                if (!sPrviousCode.includes('loss') || !sPrviousCode.includes('optimizer') || !sPrviousCode.includes('metrics')) {
                    this.block.previousConnection.disconnect();
                    throw Error('model compile 블럭의 속성들을 설정한 후 연결해주세요.');
                }
            }
        }
    }
}
