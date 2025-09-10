package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;
import com.acmerobotics.dashboard.OpModeInfo;
import java.util.List;

public class ReceiveOpModeList extends Message {
    private List<OpModeInfo> opModeInfoList;

    public ReceiveOpModeList(List<OpModeInfo> opModeInfoList) {
        super(MessageType.RECEIVE_OP_MODE_LIST);

        this.opModeInfoList = opModeInfoList;
    }
}
