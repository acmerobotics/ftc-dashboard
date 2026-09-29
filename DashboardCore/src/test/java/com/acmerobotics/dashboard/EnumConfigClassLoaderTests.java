package com.acmerobotics.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.acmerobotics.dashboard.config.ConstantProvider;
import com.acmerobotics.dashboard.config.VariableProvider;
import com.acmerobotics.dashboard.config.reflection.ReflectionConfig;
import com.acmerobotics.dashboard.message.Message;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.tools.ToolProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

public class EnumConfigClassLoaderTests {
    public enum Mode {
        A,
        B
    }

    public enum Level {
        LOW,
        HIGH;

        @Override
        public String toString() {
            return name().toLowerCase();
        }
    }

    public enum Gait {
        WALK {
            @Override
            public String toString() {
                return "walking";
            }
        },
        RUN
    }

    public static class GaitHolder {
        public static Gait gait = Gait.WALK;
    }

    public static class Holder {
        public static Mode mode = Mode.A;
        public static Mode unset;
        public static Mode[] modes = new Mode[1];
        public static Level level = Level.LOW;
        public static int count = 1;
    }

    @TempDir Path tmp;

    @BeforeEach
    public void resetHolder() {
        Holder.mode = Mode.A;
        Holder.level = Level.LOW;
        Holder.count = 1;
    }

    @Test
    public void resolvesAgainstTheDeclaredTypeInAnotherLoader() throws Exception {
        try (URLClassLoader loader = isolatedTestClasses()) {
            Class<?> holder = loader.loadClass(Holder.class.getName());
            Object[] constants = holder.getField("unset").getType().getEnumConstants();
            assertNotSame(Mode.B, constants[1]);
            DashboardCore core = register(holder);
            VariableProvider<Object> provider = new VariableProvider<>(constants[0]);
            core.addConfigVariable("Holder", "provided", provider);

            String b = enumValue("B", Mode.class);
            save(core, "unset", b);
            save(core, "modes", "{\"__type\":\"custom\",\"__value\":{\"0\":" + b + "}}");
            save(core, "provided", b);

            assertSame(constants[1], holder.getField("unset").get(null));
            assertSame(constants[1], ((Object[]) holder.getField("modes").get(null))[0]);
            assertSame(constants[1], provider.get());
        }
    }

    @Test
    public void resolvesAnEnumTheDashboardCannotSee() throws Exception {
        String reloaded =
                "package reload;\n"
                        + "public class Tuning {\n"
                        + "  public enum Gear { LOW, HIGH }\n"
                        + "  public static Gear mode = Gear.LOW;\n"
                        + "}\n";
        try (URLClassLoader loader = compile("Tuning", reloaded)) {
            Class<?> holder = loader.loadClass("reload.Tuning");
            assertThrows(ClassNotFoundException.class, () -> Class.forName("reload.Tuning$Gear"));

            save(register(holder), "mode", enumValue("HIGH", "reload.Tuning$Gear"));

            Class<?> gear = holder.getField("mode").getType();
            assertSame(gear.getEnumConstants()[1], holder.getField("mode").get(null));
        }
    }

    @Test
    public void acceptsTheValuesTheClientIsOffered() {
        DashboardCore core = register(Holder.class);

        save(core, "level", enumValue("high", Level.class));
        assertSame(Level.HIGH, Holder.level);

        save(core, "level", enumValue("LOW", Level.class));
        assertSame(Level.LOW, Holder.level);
    }

    @Test
    public void leavesTheFieldForAValueItCannotTake() {
        DashboardCore core = register(Holder.class);

        save(core, "mode", enumValue("Z", Mode.class));
        save(core, "mode", enumValue("B", Level.class));
        save(core, "mode", enumValue("B", "no.such.Enum"));
        save(core, "count", enumValue("B", Mode.class));

        assertSame(Mode.A, Holder.mode);
        assertEquals(1, Holder.count);
    }

    @Test
    public void snapshotsEnumValuesForTheBaseline() {
        DashboardCore core = register(Holder.class);
        core.addConfigVariable("Extra", "count", new ConstantProvider<>(1));

        List<Message> sent = new ArrayList<>();
        core.newSocket(sent::add)
                .onMessage(
                        DashboardCore.GSON.fromJson(
                                "{\"type\":\"GET_CONFIG_BASELINE\"}", Message.class));

        String baseline = DashboardCore.GSON.toJson(sent.get(0));
        assertTrue(
                baseline.contains(
                        "\"mode\":{\"__type\":\"enum\",\"__value\":\"A\",\"__enumClass\":\""
                                + Mode.class.getName()
                                + "\""),
                baseline);
    }

    @Test
    public void servesAnEnumWhoseConstantsHaveBodies() {
        List<Message> sent = new ArrayList<>();
        register(GaitHolder.class).newSocket(sent::add).onOpen();

        String config = DashboardCore.GSON.toJson(sent.get(0));
        assertTrue(config.contains("\"__enumClass\":\"" + Gait.class.getName() + "\""), config);
        assertTrue(config.contains("\"__enumValues\":[\"walking\",\"RUN\"]"), config);
    }

    @Test
    public void detectsAProviderEnumWhoseConstantsHaveBodies() {
        DashboardCore core = new DashboardCore();
        core.enabled = true;
        VariableProvider<Gait> provider = new VariableProvider<>(Gait.WALK);
        core.addConfigVariable("Holder", "gait", provider);

        save(core, "gait", enumValue("RUN", Gait.class));
        assertSame(Gait.RUN, provider.get());
    }

    private static String enumValue(String value, Class<?> enumClass) {
        return enumValue(value, enumClass.getName());
    }

    private static String enumValue(String value, String enumClass) {
        return "{\"__type\":\"enum\",\"__value\":\""
                + value
                + "\",\"__enumClass\":\""
                + enumClass
                + "\"}";
    }

    private static DashboardCore register(Class<?> configClass) {
        DashboardCore core = new DashboardCore();
        core.enabled = true;
        core.withConfigRoot(
                root ->
                        root.putVariable(
                                "Holder", ReflectionConfig.createVariableFromClass(configClass)));
        return core;
    }

    private static void save(DashboardCore core, String field, String variableJson) {
        String json =
                "{\"type\":\"SAVE_CONFIG\",\"configDiff\":{\"__type\":\"custom\",\"__value\":"
                        + "{\"Holder\":{\"__type\":\"custom\",\"__value\":{\""
                        + field
                        + "\":"
                        + variableJson
                        + "}}}}}";
        core.newSocket(message -> {}).onMessage(DashboardCore.GSON.fromJson(json, Message.class));
    }

    private static URLClassLoader isolatedTestClasses() {
        URL classes =
                EnumConfigClassLoaderTests.class
                        .getProtectionDomain()
                        .getCodeSource()
                        .getLocation();
        return new URLClassLoader(new URL[] {classes}, null);
    }

    private URLClassLoader compile(String simpleName, String source) throws Exception {
        Path src = Files.createDirectories(tmp.resolve("src")).resolve(simpleName + ".java");
        Files.write(src, source.getBytes(StandardCharsets.UTF_8));
        Path out = Files.createDirectories(tmp.resolve("classes"));
        int status =
                ToolProvider.getSystemJavaCompiler()
                        .run(null, null, null, "-d", out.toString(), src.toString());
        assertEquals(0, status);
        return new URLClassLoader(new URL[] {out.toUri().toURL()}, null);
    }
}
