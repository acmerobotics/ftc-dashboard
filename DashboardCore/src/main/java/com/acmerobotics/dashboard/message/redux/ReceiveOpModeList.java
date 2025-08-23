package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;
import com.acmerobotics.dashboard.OpModeInfo;
import java.util.List;

public class ReceiveOpModeList extends Message {
    private List<String> opModeList;
    private List<OpModeInfo> opModeInfoList;

    public ReceiveOpModeList(List<String> opModeList, List<OpModeInfo> opModeInfoList) {
        super(MessageType.RECEIVE_OP_MODE_LIST);

        this.opModeList = opModeList;
        this.opModeInfoList = opModeInfoList;
    }

    public List<String> getOpModeList() {
        return opModeList;
    }

    public List<OpModeInfo> getOpModeInfoList() {
        return opModeInfoList;
    }
}
