package com.acmerobotics.dashboard;

public class OpModeInfo {
    private String name;
    private String group;

    public OpModeInfo(String name, String group) {
        this.name = name;
        this.group = group;
    }

    public String getName() {
        return name;
    }

    public String getGroup() {
        return group;
    }
}
